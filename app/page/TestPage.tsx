import { useEffect, useState } from "react";
import { SerialManager } from "~/devices/serial/SerialManager";

export function TestPage() {
  const [serialManager] = useState(() => new SerialManager());
  const [connected, setConnected] = useState(false);

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
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={handleConnect}
          className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
            connected
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-gray-500 hover:bg-gray-600'
          } text-white transition-colors`}
        >
          <div className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-200' : 'bg-gray-300'
          }`} />
          <span>{connected ? 'Connected' : 'Connect'}</span>
        </button>
      </div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Mnemonic</div>
        <textarea 
          className="w-3/4 p-2 border rounded min-h-[100px] resize-both" 
          style={{ height: '100px' }}
        />
      </div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Entropy</div>
        <input className="w-3/4 p-2 border rounded" type="text" />
      </div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Seed</div>
        <input className="w-3/4 p-2 border rounded" type="text" />
      </div>
    </div>
  );
}