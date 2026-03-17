import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room, Message
from chat.tasks import send_notification

class ChatConsumer(AsyncWebsocketConsumer):

    online_users = {}

    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.user = self.scope["user"]

        self.room_group_name = f"chat_{self.room_id}"

        # reject anonymous users
        if self.user.is_anonymous:
            await self.close()
            return

        # check membership
        if not await self.user_in_room():
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        if self.room_group_name not in ChatConsumer.online_users:
            ChatConsumer.online_users[self.room_group_name] = set()
        ChatConsumer.online_users[self.room_group_name].add(self.user.username)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type" : "presence_update",
                "online_users":
                list(ChatConsumer.online_users[self.room_group_name])
            },
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name, self.channel_name
        )

        if self.room_group_name in ChatConsumer.online_users:
            ChatConsumer.online_users[self.room_group_name].discard(self.user.username)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "presence_update",
                "online_users": list(
                    ChatConsumer.online_users.get(self.room_group_name, set())
                ),
            },
        )

    
    async def presence_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "presence",
            "online_users": event["online_users"],
        }))




    async def receive(self, text_data):
        data = json.loads(text_data)

        if data.get("type") == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "typing_status",
                    "user": self.user.username,
                    "is_typing": data.get("is_typing", False),
                },
            )
            return  # ← must be INSIDE the if block!

        message = data["message"]

        await self.save_message(message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message,
                "user": self.user.username,
            },
        )


    async def typing_status(self,event):
        if event["user"] != self.user.username:
            await self.send(text_data=json.dumps({
                "type": "typing",
                "user": event["user"],
                "is_typing": event["is_typing"],
            }))


    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "message": event["message"],
                    "user": event["user"],
                }
            )
        )

    # --- Database helpers ---

    @database_sync_to_async
    def user_in_room(self):
        return Room.objects.filter(
            id=self.room_id, members=self.user
        ).exists()

    @database_sync_to_async
    def save_message(self, message):
        room = Room.objects.get(id=self.room_id)
        msg = Message.objects.create(
            room=room,
            sender=self.user,
            content=message,
        )

        send_notification.delay(msg.id)



