from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token
import logging

logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_from_token(token_key):
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        logger.warning(f"Invalid token attempted: {token_key[:10]}...")
        return AnonymousUser()


class TokenAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):

        query_string = scope["query_string"].decode()
        query_params = parse_qs(query_string)

        token = query_params.get("token")

        if token:
            scope["user"] = await get_user_from_token(token[0])
            logger.info(f"WebSocket user authenticated: {scope['user'].username if not scope['user'].is_anonymous else 'Anonymous'}")
        else:
            scope["user"] = AnonymousUser()
            logger.warning("WebSocket connection attempted without token")

        return await self.inner(scope, receive, send)