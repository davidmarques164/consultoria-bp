import os
from dotenv import load_dotenv
# Agora importamos as funções diretamente, em vez da classe
from services.drive_service import get_drive_service, criar_pasta_consultor, copiar_template

def testar_conexao():
    load_dotenv()
    
    # O get_drive_service já cuida das credenciais internamente
    print("🚀 Iniciando teste com as novas funções...")
    
    try:
        drive = get_drive_service()
        root_id = os.getenv('DRIVE_ROOT_FOLDER_ID')
        template_id = os.getenv('TEMPLATE_PLANILHA_ID')
        email_consultor = "teste_api@gmail.com"

        # 1. Testar criação de pasta
        print(f"--- Criando pasta de consultor para: {email_consultor}")
        folder_id = criar_pasta_consultor(email_consultor, drive)
        print(f"✅ Pasta criada/localizada! ID: {folder_id}")

        # 2. Testar cópia de template
        print(f"--- Copiando template para a pasta...")
        # Note que sua função copiar_template espera (empresa_folder_id, cnpj)
        resultado = copiar_template(folder_id, "12345678000199", drive)
        print(f"✅ Template copiado! URL: {resultado['planilha_url']}")

        print("\n🎉 TUDO FUNCIONANDO PERFEITAMENTE!")

    except Exception as e:
        print(f"\n❌ ERRO DURANTE O TESTE: {e}")

if __name__ == "__main__":
    testar_conexao()