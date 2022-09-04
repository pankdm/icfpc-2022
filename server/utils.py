from datetime import datetime, timedelta
import functools

class CachedData:
    data = None
    cached_until = None
    created = None
    def get(self):
        if self.cached_until and self.cached_until > datetime.utcnow():
            return (self.cached_until - datetime.utcnow(), self.data)
        return (0, None)

    def set(self, data, ttl=60):
        self.data = data
        self.cached_until = datetime.utcnow() + timedelta(seconds=ttl)


def cached(ttl):
    def decorator_cached(func):
        cache = CachedData()
        @functools.wraps(func)
        def wrapper_cached(*args, **kwargs):
            hit, result = cache.get()
            if not hit:
                result = func(*args, **kwargs)
                cache.set(result, ttl)
            return result
        return wrapper_cached
    return decorator_cached
