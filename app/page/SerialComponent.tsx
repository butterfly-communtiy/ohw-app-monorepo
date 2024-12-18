import React, { useEffect, useState } from "react";
import { SerialManager } from "~/devices/serial/SerialManager";

export const SerialComponent: React.FC = () => {
  const [serialManager] = useState(() => new SerialManager());
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    serialManager.onMessage(() => {
      // setMessages((prev) => [...prev, text]);
    });

    serialManager.onReadingState((reading) => {
      setConnected(reading);
    });

    return () => {
      serialManager.close();
    };
  }, [serialManager]);

  const handleConnect = async () => {
    if (connected) {
      await serialManager.close();
    } else {
      await serialManager.connect();
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleConnect}
        className={`mb-4 px-4 py-2 rounded ${
          connected ? "bg-red-500" : "bg-blue-500"
        } text-white`}
      >
        {connected ? "Close" : "Connect"}
      </button>

      <div className="border p-4 h-[400px] overflow-auto">
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>

      <button
        onClick={() => setMessages([])}
        className="mt-2 px-4 py-2 bg-gray-100 rounded"
      >
        Clean
      </button>
    </div>
  );
};
