// Igual ao padrão do Expo. Só na versão do Windows (web) o `import.meta` usado pelo zustand é convertido,
// porque o navegador não aceita `import.meta` fora de módulo; o app do celular não muda.
module.exports = function (api) {
  const web = api.caller((c) => c?.platform === 'web')
  return { presets: [['babel-preset-expo', web ? { unstable_transformImportMeta: true } : {}]] }
}
