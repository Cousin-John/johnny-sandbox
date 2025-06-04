using HelloWorldApi.Models;

namespace HelloWorldApi.Services;

public interface IHashStorageService
{
    void StoreHash(HashRecord record);
    HashRecord? FindByHash(string hash);
    IEnumerable<HashRecord> FindByBusinessId(string businessId);
}

public class HashStorageService : IHashStorageService
{
    private readonly List<HashRecord> _hashRecords = new();
    private readonly object _lock = new();

    public void StoreHash(HashRecord record)
    {
        lock (_lock)
        {
            _hashRecords.Add(record);
        }
    }

    public HashRecord? FindByHash(string hash)
    {
        lock (_lock)
        {
            return _hashRecords.FirstOrDefault(r => r.Hash == hash);
        }
    }

    public IEnumerable<HashRecord> FindByBusinessId(string businessId)
    {
        lock (_lock)
        {
            return _hashRecords
                .Where(r => r.BusinessId == businessId)
                .OrderByDescending(r => r.CreatedAt)
                .ToList();
        }
    }
} 