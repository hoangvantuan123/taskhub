package cache

import (
	"sync"
	"time"
)

type item struct {
	value      any
	expiration int64
}

type MemoryCache struct {
	sync.RWMutex
	items map[string]item
}

var DefaultCache = NewMemoryCache()

func NewMemoryCache() *MemoryCache {
	c := &MemoryCache{
		items: make(map[string]item),
	}
	// Background cleanup of expired items every 5 minutes
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			c.cleanup()
		}
	}()
	return c
}

func (c *MemoryCache) Set(key string, value any, duration time.Duration) {
	c.Lock()
	defer c.Unlock()

	var exp int64
	if duration > 0 {
		exp = time.Now().Add(duration).UnixNano()
	}
	c.items[key] = item{
		value:      value,
		expiration: exp,
	}
}

func (c *MemoryCache) Get(key string) (any, bool) {
	c.RLock()
	defer c.RUnlock()

	it, found := c.items[key]
	if !found {
		return nil, false
	}
	if it.expiration > 0 && time.Now().UnixNano() > it.expiration {
		return nil, false
	}
	return it.value, true
}

func (c *MemoryCache) Delete(key string) {
	c.Lock()
	defer c.Unlock()
	delete(c.items, key)
}

func (c *MemoryCache) cleanup() {
	c.Lock()
	defer c.Unlock()
	now := time.Now().UnixNano()
	for k, it := range c.items {
		if it.expiration > 0 && now > it.expiration {
			delete(c.items, k)
		}
	}
}
