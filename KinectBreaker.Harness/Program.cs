using System;
using System.Collections.Generic;
using System.Linq;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using Microsoft.AspNet.SignalR.Client;
using Microsoft.Kinect;

namespace KinectBreaker.Harness
{
    internal class Program
    {
        private static double _threshhold = 0.03;
        private static KinectSensor _kinect;
        private static readonly Subject<float> HeadXSubject = new Subject<float>();

        private static void Main(string[] args)
        {
            // Create and start hub connection
            var connection = new HubConnection("http://localhost/");
            IHubProxy hub = connection.CreateHubProxy("GameHub");
            connection.Start().Wait();

            // Create a buffer on HeadXSubject
            HeadXSubject.Buffer(TimeSpan.FromMilliseconds(40))
                .Subscribe(
                    positionList =>
                    {
                        if (positionList.Any())
                        {
                            float average = positionList.Average();
                            if (average > _threshhold)
                            {
                                Console.WriteLine("Right: {0}", average);
                                hub.Invoke("GroupMove", 1);
                                return;
                            }

                            if (average < - (_threshhold))
                            {
                                Console.WriteLine("Left: {0}", average);
                                hub.Invoke("GroupMove", -1);
                                return;
                            }

                            Console.WriteLine("Middle: {0}", average);
                        }
                    }
                );
            
            // Fire up the Kinect
            StartKinect();

            bool die = false;

            while (!die)
            {
                switch (Console.ReadKey().Key)
                {
                    case ConsoleKey.UpArrow:
                        _threshhold += 0.01;
                        break;
                    case ConsoleKey.DownArrow:
                        _threshhold -= 0.01;
                        break;
                    case ConsoleKey.Z:
                        hub.Invoke("Move", -1);
                        break;
                    case ConsoleKey.X:
                        hub.Invoke("Move", 1);
                        break;
                    case ConsoleKey.Escape:
                        die = true;
                        StopKinect();
                        break;
                }
            }
        }

        private static void StartKinect()
        {
            _kinect = KinectSensor.KinectSensors.FirstOrDefault();
            if (_kinect != null)
            {
                // Enable Skeleton stream
                _kinect.SkeletonStream.Enable();

                // Depth in near range enabled
                _kinect.DepthStream.Range = DepthRange.Near;

                // Enable returning skeletons while depth is in Near Range
                _kinect.SkeletonStream.EnableTrackingInNearRange = true;

                // Sit the fuck down
                _kinect.SkeletonStream.TrackingMode = SkeletonTrackingMode.Seated;

                // Attach event handler
                _kinect.SkeletonFrameReady += SkeletonFramesReady;

                _kinect.Start();
            }
        }

        private static void SkeletonFramesReady(object sender, SkeletonFrameReadyEventArgs e)
        {
            using (SkeletonFrame skeletonFrameData = e.OpenSkeletonFrame())
            {
                if (skeletonFrameData != null)
                {
                    var allSkeletons = new Skeleton[skeletonFrameData.SkeletonArrayLength];

                    skeletonFrameData.CopySkeletonDataTo(allSkeletons);

                    List<Skeleton> tracked =
                        allSkeletons.Where(s => s.TrackingState == SkeletonTrackingState.Tracked).ToList();
                    if (tracked.Any())
                    {
                        // Find the closest skeleton
                        Skeleton closest = tracked.OrderBy(t => t.Position.Z).First();

                        // Get the head x position
                        float headX = closest.Joints
                            .Where(j => j.JointType == JointType.Head)
                            .Select(h => h.Position.X)
                            .FirstOrDefault();

                        // Broadcast to subject
                        HeadXSubject.OnNext(headX);
                    }
                }
            }
        }

        private static void StopKinect()
        {
            _kinect.Stop();
        }
    }
}