using System;
using System.Linq;
using System.Reactive.Linq;
using KinectBreaker.Web.Hubs;
using Microsoft.AspNet.SignalR;
using Owin;

namespace KinectBreaker.Web
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            app.MapSignalR();

            GameHub.DirectionsObservable
                   .Buffer(TimeSpan.FromMilliseconds(10))
                   .Subscribe(li =>
                   {
                       if (li.Any())
                       {
                           int total = li.Sum();

                           if (total > 0)
                           {
                               IHubContext context = GlobalHost.ConnectionManager.GetHubContext<GameHub>();
                               context.Clients.All.move(1);
                           }

                           if (total < 0)
                           {
                               IHubContext context = GlobalHost.ConnectionManager.GetHubContext<GameHub>();
                               context.Clients.All.move(-1);
                           }
                       }
                   });
        }
    }
}