/**
 * Ponte entre as telas do app e o processo principal: publica `window.bpDesktop`
 * (interface descrita em app/src/plataforma/desktop.ts).
 */
const { contextBridge, ipcRenderer } = require('electron')

const chamar = (canal) => (...args) => ipcRenderer.invoke(canal, ...args)

contextBridge.exposeInMainWorld('bpDesktop', {
  banco: {
    abrir: chamar('banco:abrir'),
    exec: chamar('banco:exec'),
    run: chamar('banco:run'),
    all: chamar('banco:all'),
    first: chamar('banco:first'),
  },
  arquivos: {
    gravar: chamar('arquivos:gravar'),
    apagar: chamar('arquivos:apagar'),
    tamanho: chamar('arquivos:tamanho'),
    enviar: chamar('arquivos:enviar'),
    baixar: chamar('arquivos:baixar'),
  },
  auth: {
    entrar: chamar('auth:entrar'),
    token: chamar('auth:token'),
    sair: chamar('auth:sair'),
  },
  http: chamar('http'),
  areaTransferencia: { imagem: chamar('areaTransferencia:imagem') },
  abrirExterno: chamar('abrirExterno'),
  dialogo: (titulo, mensagem, botoes, cancelar) => ipcRenderer.sendSync('dialogo', titulo, mensagem, botoes, cancelar),
})
