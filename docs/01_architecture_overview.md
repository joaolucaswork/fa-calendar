# Arquitetura do Componente `calendarioReino`

O `calendarioReino` é um componente Lightning Web Component (LWC) monolítico, porém bem estruturado internamente, projetado para fornecer uma interface de calendário rica em recursos dentro do Salesforce. Sua arquitetura pode ser descrita da seguinte forma:

*   **Componente Principal (Controller JS - `calendarioReino.js`):**
    *   **Núcleo da Lógica:** Contém toda a lógica de apresentação, interações do usuário, gerenciamento de estado e comunicação com o backend (Apex).
    *   **Gerenciamento de Estado:** Utiliza propriedades rastreadas (`@track`) extensivamente para reatividade da UI. Mantém caches locais de eventos (`this.events`, `this.allEvents`) para performance e manipulação de dados.
    *   **Ciclo de Vida LWC:** Implementa hooks de ciclo de vida (`connectedCallback`, `renderedCallback`, `disconnectedCallback`) para carregar dependências, inicializar o calendário, e limpar recursos.

*   **Template HTML (`calendarioReino.html`):**
    *   Define a estrutura da UI, incluindo o container do FullCalendar, a sidebar, os modais e outros elementos.
    *   Utiliza diretivas LWC (`lwc:if`, `lwc:for`, etc.) para renderização condicional e faz binding de dados com as propriedades do controller JS.

*   **Estilo CSS (`calendarioReino.css`):**
    *   Contém estilos customizados para o componente, incluindo a aparência do FullCalendar, sidebar, e modais.

*   **Controladores Apex (Backend):**
    *   Responsáveis por aplicar a segurança do Salesforce (FLS, sharing) e fornecer/salvar dados.
    *   **`CalendarioController`:** Principal controller para buscar eventos, salas, usuários, e salvar alterações.
    *   **`AppointmentController`:** Usado para criar e atualizar compromissos.
    *   **`EventUtils`:** Contém métodos utilitários relacionados a eventos.
