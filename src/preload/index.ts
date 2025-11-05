import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  getGenesis: (beaconBase: string) => ipcRenderer.invoke("beacon:getGenesis", beaconBase),
  getValidator: (beaconBase: string, id: string) => ipcRenderer.invoke("beacon:getValidator", beaconBase, id),
  postBlsToExec: (beaconBase: string, payload: any) => ipcRenderer.invoke("beacon:postBlsToExec", beaconBase, payload),
  buildBlsToExec: (args: any) => ipcRenderer.invoke("bls:buildChange", args),
  saveJSON: (defaultName: string, obj: any) => ipcRenderer.invoke("file:saveJSON", defaultName, obj),
  eip7002GetFee: (rpcUrl: string) => ipcRenderer.invoke("eip7002:getFee", rpcUrl),
  eip7002Submit: (args: any) => ipcRenderer.invoke("eip7002:submit", args),
});
