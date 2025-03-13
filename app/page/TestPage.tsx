import { useEffect, useState, useCallback } from "react";
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
import "web-serial-polyfill";
import { serial } from "web-serial-polyfill";

import { Core } from "@walletconnect/core";
import { WalletKit, type WalletKitTypes } from "@reown/walletkit";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import type { SessionTypes } from "@walletconnect/types";

import { atom, getDefaultStore, useAtom } from "jotai";
import { Transaction } from "ethers";

const core = new Core({
  projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
});

const metadata = {
  name: "OHW",
  description: "WalletKit",
  url: "https://ohw-app.vercel.app",
  icons: ["https://avatars.githubusercontent.com/u/122866640"],
};

const walletKit = await WalletKit.init({
  core,
  metadata,
});

const store = getDefaultStore();

export const connectedAtom = atom<boolean>(false);
export const signatureAtom = atom<string>("");
export const messageAtom = atom<string>("");
export const addressAtom = atom<string>("");
export const pathAtom = atom<string>("m/44'/60'/0'/0/0");

export function TestPage() {
  const [serialManager] = useState(() => new SerialManager());

  const [signature] = useAtom(signatureAtom);

  const [connected, setConnected] = useAtom(connectedAtom);

  const [message, setMessage] = useAtom(messageAtom);

  const [mnemonic, setMnemonic] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useAtom(addressAtom);

  const [walletKitUri, setWalletKitUri] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [ohw, setOHW] = useState(false);
  const [version, SetVersion] = useState("");
  const [path, setPath] = useAtom(pathAtom);

  const [walletConnect, setWalletConnect] = useState(false);

  const [activeSessions, setActiveSessions] = useState<SessionTypes.Struct[]>(
    [],
  );

  const { confirm, Dialog } = useConfirm();

  useEffect(() => {
    updateActiveSessions();
  }, [walletConnect]);

  const updateActiveSessions = () => {
    try {
      const sessions = walletKit.getActiveSessions();
      setActiveSessions(Object.values(sessions) as SessionTypes.Struct[]);
    } catch (error) {
      console.error("get active session fail:", error);
    }
  };

  const handleDisconnect = async (topic: string) => {
    try {
      await walletKit.disconnectSession({
        topic: topic,
        reason: getSdkError("USER_DISCONNECTED"),
      });
    } catch (error) {
      console.error("disconnect fail:", error);
    } finally {
      updateActiveSessions();
    }
  };

  useEffect(() => {
    // wallectConnectDisconnect();
  }, []);

  useEffect(() => {
    serialManager.onMessage((data) => {
      console.log(data.payload);
      switch (data.payload.oneofKind) {
        case "versionResponse": {
          const version = data.payload.versionResponse;
          setOHW(true);
          SetVersion(version.version);
          setInitialized(version.features?.initialized ?? false);

          if (version.features?.initialized) {
            setMnemonic(
              "Initialization has been completed. Scroll down to use more functions.",
            );
            derivePublicKey();
            initWalletKitEvent();
          }

          break;
        }
        case "initWalletResponse": {
          const init = data.payload.initWalletResponse;
          setInitialized(true);
          setMnemonic(init.mnemonic ?? "");
          derivePublicKey();
          initWalletKitEvent();
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
          // const recoveryId = data.payload.signResponse.recoveryId;
          const public_key = data.payload.signResponse.publicKey;

          let signature_with_id = "";

          signature_with_id = ethers.hexlify(signature) + "1b";

          const check1 = ethers.recoverAddress(hash, signature_with_id);

          if (check1 == serialManager.publicKeyToAddress(public_key)) {
            store.set(signatureAtom, ethers.hexlify(signature_with_id));
            return;
          }

          signature_with_id = ethers.hexlify(signature) + "1c";

          const check2 = ethers.recoverAddress(hash, signature_with_id);

          if (check2 == serialManager.publicKeyToAddress(public_key)) {
            store.set(signatureAtom, ethers.hexlify(signature_with_id));
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

  const initWalletKitEvent = async () => {
    console.log("walletconnect", "init");
    walletKit?.on("session_proposal", onSessionProposal);

    walletKit?.on("session_request", onSessionRequest);
  };

  async function onSessionRequest(event: WalletKitTypes.SessionRequest) {
    try {
      console.log("event", event);
      const { topic, params, id } = event;
      if (params.request.method == "personal_sign") {
        const requestParamsMessage = params.request.params[0];
        const data = ethers.toUtf8String(requestParamsMessage);

        const message = "Do you agree sign message?" + "\n\n" + data;

        // alert(message);
        if (!(await confirm(message))) {
          return;
        }

        store.set(messageAtom, data);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        signMessage();

        await new Promise((resolve) => setTimeout(resolve, 6000));

        const response = {
          id,
          result: store.get(signatureAtom),
          jsonrpc: "2.0",
        };

        console.log("sign", store.get(signatureAtom));

        await walletKit.respondSessionRequest({ topic, response });
      }
      if (params.request.method == "eth_sendTransaction") {
        const { from, ...newData } = params.request.params[0];

        if (from != store.get(addressAtom)) {
          alert("Address not this use path! please check!");
          return;
        }

        if (!newData.chainId) {
          newData.chainId = parseInt(params.chainId.substring(7));
        }

        const tx = Transaction.from(newData);

        const formatObject = (obj: object) => {
          return Object.entries(obj)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n");
        };

        const message =
          "Do you agree sign transaction?" + "\n\n" + formatObject(newData);

        // alert(message);
        if (!(await confirm(message))) {
          return;
        }

        const unsignedHash = tx.unsignedHash;

        store.set(messageAtom, unsignedHash);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        signMessage();

        await new Promise((resolve) => setTimeout(resolve, 6000));

        const sig = Transaction.from({
          ...newData,
          signature: store.get(signatureAtom),
        });

        const provider = ethers.getDefaultProvider(
          parseInt(params.chainId.substring(7)),
          {
            infura: import.meta.env.VITE_INFURA_ID,
            exclusive: "infura",
          },
        );

        // const provider = new ethers.JsonRpcProvider(
        //   "https://sepolia.infura.io/v3/" + import.meta.env.VITE_INFURA_ID,
        // );
        const txResponse = await provider.broadcastTransaction(sig.serialized);

        console.log(txResponse);

        // const receipt = await txResponse.wait();

        // console.log(receipt);

        const response = {
          id,
          result: txResponse.hash,
          jsonrpc: "2.0",
        };

        await walletKit.respondSessionRequest({ topic, response });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function onSessionProposal({
    id,
    params,
  }: WalletKitTypes.SessionProposal) {
    try {
      console.log(params);
      let chains = ["eip155:1"];

      if (params.requiredNamespaces?.eip155?.chains) {
        chains = [...chains, ...params.requiredNamespaces.eip155.chains];
      }

      if (params.optionalNamespaces?.eip155?.chains) {
        chains = [...chains, ...params.optionalNamespaces.eip155.chains];
      }
      chains = Array.from(new Set(chains));
      const approvedNamespaces = buildApprovedNamespaces({
        proposal: params,
        supportedNamespaces: {
          eip155: {
            chains,
            methods: [
              "personal_sign",
              "eth_sendTransaction",
              "eth_signTransaction",
              "eth_sign",
              "eth_signTypedData",
            ],
            events: ["accountsChanged", "chainChanged"],
            accounts: chains.map(
              (chain) => `${chain}:${store.get(addressAtom)}`,
            ),
          },
        },
      });

      const message =
        "Do you agree link ohw?" +
        "\n\n" +
        params.proposer.metadata.name +
        "\n" +
        params.proposer.metadata.url +
        "\n";

      // alert(message);
      if (!(await confirm(message))) {
        return;
      }

      await walletKit?.approveSession({
        id,
        namespaces: approvedNamespaces,
      });

      updateActiveSessions();
    } catch (err) {
      console.log("err", err);
      await walletKit?.rejectSession({
        id: id,
        reason: getSdkError("USER_REJECTED"),
      });
    }
  }

  const handleConnect = async () => {
    if (!navigator.serial) {
      Object.defineProperty(navigator, "serial", {
        value: serial,
        configurable: true,
        writable: true,
      });
    }
    if (!navigator.serial || !navigator.usb) {
      alert(
        "Web Serial API is only supported in Chrome/Edge browsers. Please switch to Chrome or Edge to use this feature.",
      );
      return;
    }
    if (connected) {
      await serialManager.close();
      setOHW(false);
      setInitialized(false);
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
          length: 24,
          password: password,
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await serialManager.sendProtobuf(initRequest);
  };

  const signMessage = async () => {
    const message = store.get(messageAtom);
    console.log("message", message);

    let bytes = new Uint8Array();

    if (!message.startsWith("0x")) {
      bytes = ethers.getBytesCopy(ethers.hashMessage(message));
    } else {
      bytes = ethers.getBytesCopy(message);
    }

    const signRequest = ReqData.create({
      payload: {
        oneofKind: "signRequest",
        signRequest: SignRequest.create({
          id: 0,
          preHash: bytes,
          path: store.get(pathAtom),
          message: bytes,
        }),
      },
    });
    await serialManager.sendProtobuf(signRequest);
  };

  const walletKitConnect = async () => {
    await walletKit?.pair({ uri: walletKitUri });
    setWalletConnect(true);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {Dialog}
      <div className="flex justify-end mb-4">
        <button
          onClick={() =>
            window.open("https://espressif.github.io/esptool-js/", "_blank")
          }
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mr-[20px]"
        >
          Flash Firmware
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

      <div className="flex" style={{ height: "20px" }}></div>

      <div className="flex justify-center flex-col items-center">
        <h1 className="text-3xl font-bold">OHW Test Page</h1>

        <div className="mt-4 max-w-2xl text-center text-red-500">
          <p className="font-bold mb-2">
            ⚠️ WARNING: Developer Test Page Only ⚠️
          </p>
          <p>This is a test environment for developers. Please:</p>
          <ul className="mt-2">
            <li>
              DO NOT use imported or generated mnemonic phrases to hold any
              cryptocurrency
            </li>
            <li>⚠️ Any data may be cleared without notice ⚠️</li>
            <li>The chip is not locked, so it is not secure</li>
          </ul>
        </div>

        <div className="mt-4 max-w-2xl text-center">
          <a
            href="https://github.com/butterfly-communtiy/ohw-elf-firmware/tree/master/doc/start"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 transition-colors"
          >
            User Guide
          </a>
        </div>
      </div>

      <div className="flex" style={{ height: "20px" }}></div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">OHW Status: </div>
        <div className="w-3/4 p-2">
          {ohw ? (
            <span className="text-green-600">OK Version: {version}</span>
          ) : (
            <span className="text-red-600">Not Found</span>
          )}
          {!ohw && connected && (
            <span className="text-red-600">
              &nbsp;ohw firmware, Please{" "}
              <a
                href="https://github.com/butterfly-communtiy/ohw-elf-firmware"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                check the manual
              </a>
              !
            </span>
          )}
        </div>
      </div>

      <div className="flex" style={{ height: "20px" }}></div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Mnemonic :</div>
        <textarea
          className="w-3/4 p-2 border rounded min-h-[100px] resize-both"
          style={{ height: "100px" }}
          value={mnemonic}
          disabled={initialized}
          onChange={(e) => setMnemonic(e.target.value)}
        />
      </div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Password :</div>
        <input
          className="w-3/4 p-2 border rounded"
          type="text"
          value={password}
          disabled={initialized}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="flex">
        {!initialized && ohw && (
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

      <div className="flex" style={{ height: "150px" }}></div>

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
          {initialized && (
            <button
              onClick={derivePublicKey}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Get Address
            </button>
          )}
        </div>
      </div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Address :</div>
        <input
          className="w-3/4 p-2 border rounded"
          type="text"
          value={address}
          readOnly
        />
      </div>

      <div className="flex" style={{ height: "150px" }}></div>

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
          {initialized && (
            <button
              onClick={signMessage}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Sign Message
            </button>
          )}
        </div>
      </div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">Signature :</div>
        <input
          className="w-3/4 p-2 border rounded"
          type="text"
          value={signature}
          readOnly
        />
      </div>

      <div className="flex" style={{ height: "80px" }}></div>

      <div className="flex">
        <div className="w-1/4 text-right pr-4 pt-2">WalletConnect :</div>
        <input
          className="w-3/4 p-2 border rounded resize-both"
          value={walletKitUri}
          onChange={(e) => setWalletKitUri(e.target.value)}
        />
      </div>

      <div className="flex">
        <div className="w-1/4"></div>
        <div className="w-3/4 flex space-x-4">
          {address && walletKitUri && (
            <button
              onClick={walletKitConnect}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {walletConnect ? "Re Add" : "Add"}
            </button>
          )}
        </div>
      </div>

      <div className="flex mt-8">
        <div className="w-1/4 text-right pr-4 pt-2">Active Sessions:</div>
        <div className="w-3/4">
          {activeSessions.length === 0 ? (
            <div className="text-gray-500">No active sessions</div>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div
                  key={session.topic}
                  className="border rounded p-4 bg-white shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="font-medium">
                        {session.peer.metadata.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Topic: {session.topic.slice(0, 10)}...
                      </div>
                      <div className="text-sm text-gray-500">
                        Connected:{" "}
                        {new Date(session.expiry * 1000).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDisconnect(session.topic)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                  <div className="mt-2 text-sm">
                    <div className="text-gray-600">
                      URL: {session.peer.metadata.url}
                    </div>
                    <div className="text-gray-600">
                      Chains: {session.namespaces.eip155.chains?.join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeSessions.length > 0 && (
        <div className="flex mt-4">
          <div className="w-1/4"></div>
          <div className="w-3/4">
            <button
              onClick={async () => {
                for (const session of activeSessions) {
                  await handleDisconnect(session.topic);
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Disconnect All
            </button>
          </div>
        </div>
      )}

      <div className="flex" style={{ height: "1000px" }}></div>
    </div>
  );
}

export default function useConfirm() {
  const [show, setShow] = useState(false);
  const [resolver, setResolver] = useState<(value: boolean) => void>();
  const [message, setMessage] = useState("");

  const confirm = useCallback((message: string) => {
    setMessage(message);
    setShow(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    resolver?.(true);
    setShow(false);
  };

  const handleCancel = () => {
    resolver?.(false);
    setShow(false);
  };

  const Dialog = show ? (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <p className="my-4 whitespace-pre-line">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={handleCancel} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, Dialog };
}
