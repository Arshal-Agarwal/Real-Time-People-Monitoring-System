'use client';
import { useEffect, useState } from "react";

export default function Home() {
  const [notifications, setNotifications] = useState([]);
  const [currentCount, setCurrentCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [threshold, setThreshold] = useState(4);
  const [isEditing, setIsEditing] = useState(false);
  const [tempThreshold, setTempThreshold] = useState('4');

  // Add function to update threshold
  const updateThreshold = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/threshold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: parseInt(tempThreshold) }),
      });

      if (response.ok) {
        setThreshold(parseInt(tempThreshold));
        setIsEditing(false);
      } else {
        console.error('Failed to update threshold');
      }
    } catch (error) {
      console.error('Error updating threshold:', error);
    }
  };

  useEffect(() => {
    let retryTimeout;
    const alertSound = new Audio('/alert.mp3');

    const connectSSE = () => {
      const eventSource = new EventSource('http://localhost:5000/api/events');

      eventSource.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        setNotifications(prev => [notification, ...prev].slice(0, 10));
        if (notification.count !== undefined) {
          setCurrentCount(notification.count);
          if (notification.count >= threshold) {
            alertSound.play().catch(err => {
              console.warn("Audio playback blocked or failed:", err);
            });
          }
        }
      };

      eventSource.onopen = () => {
        setConnectionStatus('connected');
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setConnectionStatus('disconnected');
        eventSource.close();
        retryTimeout = setTimeout(connectSSE, 5000);
      };

      return eventSource;
    };

    const eventSource = connectSSE();

    return () => {
      clearTimeout(retryTimeout);
      eventSource.close();
    };
  }, [threshold]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 md:p-8">
      <main className="max-w-lg mx-auto">
        {/* Header Section */}
        <div className="flex flex-col gap-3 md:flex-row md:gap-4 justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white text-center md:text-left">
            People Counter Monitor
          </h1>
          <div className={`text-xs md:text-sm px-3 py-1 rounded-full whitespace-nowrap ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            connectionStatus === 'disconnected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          }`}>
            {connectionStatus}
          </div>
        </div>

        {/* Count Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">
            <h2 className="text-base md:text-xl text-gray-800 dark:text-gray-200">Current Count</h2>
            <div className={`text-3xl md:text-4xl font-bold ${
              currentCount >= threshold ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {currentCount} / {threshold}
            </div>
          </div>
          
          {/* Add Threshold Control */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Threshold:</span>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tempThreshold}
                  onChange={(e) => setTempThreshold(e.target.value)}
                  className="w-16 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="1"
                />
                <button
                  onClick={updateThreshold}
                  className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setTempThreshold(threshold.toString());
                  }}
                  className="px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                Edit
              </button>
            )}
          </div>

          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-2">
            {currentCount >= threshold ? 'Maximum capacity reached!' : 'Within safe capacity'}
          </p>
        </div>

        {/* Notifications Section */}
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-white">
            Recent Alerts
          </h2>
        </div>

        <div className="space-y-2 md:space-y-3">
          {notifications.map((notification, index) => (
            <div 
              key={index}
              className={`p-3 md:p-4 rounded-lg shadow-sm ${
                notification.type === 'warning' 
                  ? 'bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400' :
                notification.type === 'danger'
                  ? 'bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400' :
                'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400'
              }`}
            >
              <p className="font-medium text-xs md:text-base dark:text-gray-100">
                {notification.message}
              </p>
              <p className="text-[10px] md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="text-gray-500 dark:text-gray-400 text-center p-4 md:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-xs md:text-sm">
              No alerts yet - System monitoring active
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
