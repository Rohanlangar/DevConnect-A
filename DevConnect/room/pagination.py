from rest_framework.pagination import CursorPagination


class MessageCursorPagination(CursorPagination):
    """
    Cursor-based pagination for chat messages.

    Why cursor instead of offset (PageNumberPagination)?
    - Chat is append-heavy: new messages arrive constantly.
    - With offset pagination (?page=2), inserting a new message shifts every
      row by 1, causing duplicates or skipped messages on the next page fetch.
    - Cursor pagination uses an opaque token that points to a specific row,
      so new inserts don't affect the client's position.
    - It also avoids expensive COUNT(*) queries on large tables.

    How it works:
    - DRF encodes the value of the ordering field (created_at) of the last row
      into a base64 cursor token.
    - The next request sends ?cursor=<token>, and DRF filters with
      WHERE created_at < <value> (for descending order).
    - The response includes `next` and `previous` URLs with cursor tokens.
    """
    page_size = 50
    ordering = "-created_at"  # newest messages first
    cursor_query_param = "cursor"
