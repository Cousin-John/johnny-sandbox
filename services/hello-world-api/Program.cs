using HelloWorldApi.Helpers;
using HelloWorldApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSingleton<IHashHelper, HashHelper>();
builder.Services.AddSingleton<IHashStorageService, HashStorageService>();

// Configure Kestrel to use specific ports
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5005); // HTTP
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run(); 