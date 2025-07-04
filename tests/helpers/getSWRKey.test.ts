import getSWRKey from '@root/helpers/getSWRKey';

describe('getSWRKey', () => {
  test('should return serialized key for URL string', () => {
    const url = '/api/test';
    const result = getSWRKey(url);
    
    expect(typeof result).toBe('string');
    expect(result).toBeDefined();
  });

  test('should return serialized key for URL string with init options', () => {
    const url = '/api/test';
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
    const result = getSWRKey(url, init);
    
    expect(typeof result).toBe('string');
    expect(result).toBeDefined();
  });

  test('should return different keys for different URLs', () => {
    const url1 = '/api/test1';
    const url2 = '/api/test2';
    
    const key1 = getSWRKey(url1);
    const key2 = getSWRKey(url2);
    
    expect(key1).not.toBe(key2);
  });

  test('should return different keys for same URL with different init options', () => {
    const url = '/api/test';
    const init1 = { method: 'GET' };
    const init2 = { method: 'POST' };
    
    const key1 = getSWRKey(url, init1);
    const key2 = getSWRKey(url, init2);
    
    expect(key1).not.toBe(key2);
  });

  test('should return same key for same URL and init options', () => {
    const url = '/api/test';
    const init = { method: 'GET', headers: { 'Accept': 'application/json' } };
    
    const key1 = getSWRKey(url, init);
    const key2 = getSWRKey(url, init);
    
    expect(key1).toBe(key2);
  });

  test('should handle Request object as input', () => {
    const request = new Request('https://example.com/api/test', { method: 'GET' });
    const result = getSWRKey(request);
    
    expect(typeof result).toBe('string');
    expect(result).toBeDefined();
  });

  test('should handle undefined init parameter', () => {
    const url = '/api/test';
    const result = getSWRKey(url, undefined);
    
    expect(typeof result).toBe('string');
    expect(result).toBeDefined();
  });

  test('should handle empty string URL', () => {
    const result = getSWRKey('');
    
    expect(typeof result).toBe('string');
    expect(result).toBeDefined();
  });
});

export {};