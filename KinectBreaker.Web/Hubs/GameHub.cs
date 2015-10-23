using System.Reactive.Subjects;
using Microsoft.AspNet.SignalR;

namespace KinectBreaker.Web.Hubs
{
    public class GameHub : Hub
    {
        public static readonly ISubject<int, int> DirectionsObservable = Subject.Synchronize(new Subject<int>());

        public void Move(int direction)
        {
            Clients.All.move(direction);
        }

        public void GroupMove(int direction)
        {
            DirectionsObservable.OnNext(direction);
        }
    }
}