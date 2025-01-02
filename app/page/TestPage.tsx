import { useEffect, useState } from "react";
import { SerialManager } from "~/devices/serial/SerialManager";
import {
  DerivePublicKeyRequest,
  InitWalletCustomRequest,
  InitWalletRequest,
  ReqData,
  SignRequest,
  VersionRequest,
} from "~/protocols/protobuf/ohw";
import { ethers } from "ethers";

export function TestPage() {
  const [serialManager] = useState(() => new SerialManager());
  const [connected, setConnected] = useState(false);
  const [mnemonic, setMnemonic] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [signature, setSignature] = useState("");
  const [path, setPath] = useState("m/44'/60'/0'/0/0");

  useEffect(() => {
    serialManager.onMessage((data) => {
      console.log(data.payload);
      switch (data.payload.oneofKind) {
        case "versionResponse": {
          const version = data.payload.versionResponse;
          setInitialized(version.features?.initialized ?? false);
          break;
        }
        case "initWalletResponse": {
          const init = data.payload.initWalletResponse;
          setMnemonic(init.mnemonic ?? "");
          setInitialized(true);
          break;
        }
        case "derivePublicKeyResponse": {
          const pk = data.payload.derivePublicKeyResponse.publicKey;
          setAddress(serialManager.publicKeyToAddress(pk));
          break;
        }
        case "signResponse": {
          const signature = data.payload.signResponse.signature;
          const hash = data.payload.signResponse.preHash;
          const recoveryId = data.payload.signResponse.recoveryId;
          const public_key = data.payload.signResponse.publicKey;

          let signature_with_id = "";

          if (recoveryId) {
            signature_with_id =
              ethers.hexlify(signature) +
              ethers.hexlify(new Uint8Array([recoveryId + 27])).slice(2);
            setSignature(ethers.hexlify(signature_with_id));
            return;
          }

          signature_with_id = ethers.hexlify(signature) + "1b";

          const check1 = ethers.recoverAddress(hash, signature_with_id);

          if (check1 == serialManager.publicKeyToAddress(public_key)) {
            setSignature(ethers.hexlify(signature_with_id));
            return;
          }

          signature_with_id = ethers.hexlify(signature) + "1c";

          const check2 = ethers.recoverAddress(hash, signature_with_id);

          if (check2 == serialManager.publicKeyToAddress(public_key)) {
            setSignature(ethers.hexlify(signature_with_id));
            return;
          }

          break;
        }
        default:
          console.log("Error Data");
      }
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await getVersion();
    }
  };

  const getVersion = async () => {
    const versionRequest = ReqData.create({
      payload: {
        oneofKind: "versionRequest",
        versionRequest: VersionRequest.create({}),
      },
    });

    await serialManager.sendProtobuf(versionRequest);
  };

  const initWallet = async () => {
    const initRequest = ReqData.create({
      payload: {
        oneofKind: "initRequest",
        initRequest: InitWalletRequest.create({
          length: 12,
          password: "",
        }),
      },
    });

    await serialManager.sendProtobuf(initRequest);
  };

  const initWalletCustom = async () => {
    if (!mnemonic) {
      alert("Please enter both mnemonic and password");
      return;
    }
    const initRequest = ReqData.create({
      payload: {
        oneofKind: "initCustomRequest",
        initCustomRequest: InitWalletCustomRequest.create({
          words: mnemonic,
          password: password,
        }),
      },
    });

    await serialManager.sendProtobuf(initRequest);
  };

  const derivePublicKey = async () => {
    const initRequest = ReqData.create({
      payload: {
        oneofKind: "derivePublicKeyRequest",
        derivePublicKeyRequest: DerivePublicKeyRequest.create({
          path: path,
        }),
      },
    });

    await serialManager.sendProtobuf(initRequest);
  };

  const signMessage = async () => {
    const hash = ethers.hashMessage(message);

    const signRequest = ReqData.create({
      payload: {
        oneofKind: "signRequest",
        signRequest: SignRequest.create({
          id: 0,
          preHash: ethers.getBytesCopy(hash),
          path: path,
        }),
      },
    });
    await serialManager.sendProtobuf(signRequest);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex justify-end mb-4">
        <button
           onClick={() => window.open('https://ohw-flash.lastline.tech', '_blank')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mr-[20px]"
        >
          Flash
        </button>

        <button
          onClick={handleConnect}
          className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
            connected
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-500 hover:bg-gray-600"
          } text-white transition-colors`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-200" : "bg-gray-300"
            }`}
          />
          <span>{connected ? "Connected" : "Connect"}</span>
        </button>
      </div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Mnemonic :</div>
        <textarea
          className="w-3/4 p-2 border rounded min-h-[100px] resize-both"
          style={{ height: "100px" }}
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
        />
      </div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Password :</div>
        <input
          className="w-3/4 p-2 border rounded"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="flex">
        {!initialized && (
          <>
            <div className="w-1/4"></div>
            <div className="w-3/4 flex space-x-4">
              <button
                onClick={initWalletCustom}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Import
              </button>
              <button
                onClick={initWallet}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Generate
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex" style={{ height: "500px" }}></div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Path :</div>
        <input
          className="w-3/4 p-2 border rounded"
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
      </div>

      <div className="flex">
        <div className="w-1/4"></div>
        <div className="w-3/4 flex space-x-4">
          <button
            onClick={derivePublicKey}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Get Address
          </button>
        </div>
      </div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Address :</div>
        <input
          className="w-3/4 p-2 border rounded"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="flex" style={{ height: "500px" }}></div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Message :</div>
        <textarea
          className="w-3/4 p-2 border rounded min-h-[100px] resize-both"
          style={{ height: "100px" }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div className="flex">
        <div className="w-1/4"></div>
        <div className="w-3/4 flex space-x-4">
          <button
            onClick={signMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Sign Message
          </button>
        </div>
      </div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Signature :</div>
        <input
          className="w-3/4 p-2 border rounded"
          type="text"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
        />
      </div>

      <div className="flex" style={{ height: "500px" }}></div>
    </div>
  );
}
