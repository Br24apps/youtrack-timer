# YouTrack Time Kory

Esta extensão adiciona um botão de Start/Stop para registrar tempo diretamente nas issues do YouTrack.

![image](https://github.com/ikorgik/youtrack-timer/assets/999006/6c4200ce-7135-4133-a8db-d274356742c3)
![image](https://github.com/ikorgik/youtrack-timer/assets/999006/0049b06b-c3a9-408b-8930-292a0a5e035e)

---

## Como instalar a extensão no Chrome

### 1. Baixe ou clone o repositório

```bash
git clone https://github.com/seu-usuario/youtrack-timer.git
```

Ou baixe o repositório como `.zip` e extraia em uma pasta de sua escolha.

### 2. Abra a página de extensões do Chrome

No Chrome, acesse:

```
chrome://extensions
```

Ou clique no menu (⋮) > **Extensões** > **Gerenciar extensões**.

### 3. Ative o Modo do desenvolvedor

No canto superior direito da página de extensões, ative a opção **Modo do desenvolvedor**.

### 4. Carregue a extensão

Clique em **Carregar sem compactação** e selecione a pasta `chrome-extension` dentro do repositório clonado/extraído.

### 5. Confirme a instalação

A extensão **YouTrack Time Kory** aparecerá na lista de extensões instaladas. Você também pode fixá-la na barra de ferramentas clicando no ícone de quebra-cabeça (🧩) e depois no ícone de fixar ao lado da extensão.

### 6. Configure a extensão

Clique com o botão direito no ícone da extensão na barra de ferramentas e selecione **Opções**, ou acesse diretamente via `chrome://extensions` > **Detalhes** > **Opções da extensão**.

---

## Como configurar a extensão

### Domínio do YouTrack

No campo **YouTrack server domain**, insira a URL completa do seu YouTrack:

```
https://suaempresa.youtrack.cloud
```

### Token de autenticação

No campo **YouTrack authentication token**, insira o seu token permanente no formato `perm:XXXXXX`.

Para gerar um token:

1. Acesse seu YouTrack e vá em **Perfil** (canto superior direito)
2. Clique em **Account Security**
3. Na seção **Tokens**, clique em **New Token**
4. Dê um nome ao token (ex: `kory-extension`) e clique em **Create**
5. Copie o token gerado e cole no campo da extensão

### Issues favoritas (opcional)

No campo **Favorite issues**, adicione os IDs das issues que você quer fixar no popup para acesso rápido, separados por vírgula:

```
PROJ-32,PROJ-36,PROJ-48
```

### Salvar

Clique em **Save**. A extensão irá validar a conexão com o servidor e estará pronta para uso.

---

Descrição completa (versão original): https://chromewebstore.google.com/detail/youtrack-time-tracker/nahoodjdihpfpfjiblalpnkaanebkdnf
