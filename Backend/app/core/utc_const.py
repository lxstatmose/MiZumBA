import sys
from datetime import datetime, timedelta

if sys.version_info >= (3, 11):
    from datetime import UTC
else:
    from datetime import timezone

    UTC = timezone.utc

__all__ = ["UTC", "datetime", "timedelta"]
