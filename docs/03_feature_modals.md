# Análise de Funcionalidade: Modais Interativos

O `calendarioReino` utiliza dois modais flutuantes principais para interações do usuário, ambos posicionados com a biblioteca Floating UI.

## 1. Modal Seletor de Cores (Menu de Contexto do Evento)

*   **Acionamento:** Clique no ícone de três pontos de um evento no calendário.
*   **Funcionalidades:**
    *   **Edição de Cor:** Permite ao usuário selecionar uma cor predefinida ou customizada para o evento. A alteração é salva automaticamente via Apex com debouncing.
    *   **Gerenciamento de Link de Reunião:** Permite adicionar/editar um link de reunião. Inclui validação de URL e exibe um "card" formatado para links conhecidos (ex: Microsoft Teams).
    *   **Status e Resultado da Reunião:** Permite definir se a reunião aconteceu e, caso não, seu status (Cancelado, Adiado, Reagendado).
    *   **Atribuição de Sala:** Permite alterar a sala de uma reunião presencial.
    *   **Exclusão de Evento:** Permite excluir o evento com confirmação.
*   **Lógica Chave:**
    *   `openColorPicker()` / `closeColorPicker()`: Gerenciam o ciclo de vida do modal.
    *   `EventColorManager`: Uma classe/objeto que encapsula a lógica de determinação e salvamento de cores.
    *   `calculateColorPickerPosition()`: Usa Floating UI para posicionamento inteligente.

## 2. Modal de Agendamento Compacto

*   **Acionamento:** Clique em um dia ou horário vago no calendário (`dayClick`).
*   **Funcionalidades:**
    *   Criação rápida de um novo compromisso.
    *   Seleção do tipo de compromisso (Presencial, Online, Telefônica).
    *   Definição de data/hora de início e fim.
    *   Assunto gerado automaticamente com base nos campos preenchidos.
    *   Seleção de status da reunião.
*   **Lógica Chave:**
    *   `openCompactAppointmentModal()` / `closeCompactAppointmentModal()`: Gerenciam o ciclo de vida.
    *   `handleCompactSave()`: Valida os dados e chama o método Apex `createAppointment` para salvar.
    *   `calculateCompactModalPosition()`: Reutiliza o mesmo padrão de posicionamento do Floating UI do outro modal.
