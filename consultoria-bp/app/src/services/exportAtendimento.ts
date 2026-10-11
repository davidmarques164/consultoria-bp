/**
 * Lê os registros locais de uma empresa e devolve o atendimento.json, o resumo em Markdown
 * e a lista de arquivos (fotos, faturas) que precisam subir para a pasta do Drive.
 * O envio para o Drive é a etapa seguinte; aqui nada sai do aparelho.
 */
import { getEmpresa } from '../db/operations'
import {
  getAtendimentoFaseA, listarAcoesTarifarias, listarCargas, listarFaturasArquivo, listarIntervencoes,
} from '../db/faseA'
import { atendimentoParaMarkdown, montarAtendimento, nomePastaEmpresa } from '../utils/atendimentoJson'
import { AtendimentoJson, ArquivoParaEnvio } from '../types/atendimentoJson'

export interface PacoteDaEmpresa {
  pasta: string
  json: AtendimentoJson
  markdown: string
  arquivos: ArquivoParaEnvio[]
}

export async function exportarAtendimento(
  empresaId: string,
  atendimentoId: string,
  consultor: { nome: string | null; email: string | null }
): Promise<PacoteDaEmpresa> {
  const empresa = await getEmpresa(empresaId)
  const atendimento = await getAtendimentoFaseA(atendimentoId)
  if (!empresa || !atendimento) throw new Error('Empresa ou atendimento não encontrado no aparelho.')
  const [faturas, cargas, intervencoes, tarifario] = await Promise.all([
    listarFaturasArquivo(empresaId), listarCargas(atendimentoId), listarIntervencoes(atendimentoId), listarAcoesTarifarias(atendimentoId),
  ])
  const { json, arquivos } = montarAtendimento({ empresa, atendimento, consultor, faturas, cargas, intervencoes, tarifario })
  return { pasta: nomePastaEmpresa(empresa.cnpj, empresa.razao_social), json, markdown: atendimentoParaMarkdown(json), arquivos }
}
