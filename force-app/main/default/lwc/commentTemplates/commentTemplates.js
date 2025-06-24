import { LightningElement, api, track } from "lwc";

export default class CommentTemplates extends LightningElement {
  // Propriedades de rastreamento
  @track selectedTemplateId = null;
  @track selectedTemplateText = "";
  @track customTemplateText = "";
  @track isCustomTemplate = false;

  // API properties para expor externamente
  @api
  get templateText() {
    return this.selectedTemplateText;
  }

  // Getters para controle de UI
  get selectedTemplate() {
    return this.selectedTemplateId !== null;
  }

  // Métodos para rolagem horizontal com os botões
  scrollLeft() {
    const container = this.template.querySelector(
      '[data-id="templates-wrapper"]'
    );
    if (container) {
      // Rola uma quantidade fixa para a esquerda com animação suave
      container.scrollBy({ left: -200, behavior: "smooth" });
    }
  }

  scrollRight() {
    const container = this.template.querySelector(
      '[data-id="templates-wrapper"]'
    );
    if (container) {
      // Rola uma quantidade fixa para a direita com animação suave
      container.scrollBy({ left: 200, behavior: "smooth" });
    }
  }

  // Método para lidar com o clique em uma pílula de template
  handleTemplatePillClick(event) {
    const pillElement = event.currentTarget;
    const templateId = pillElement.dataset.id;

    // Se já está selecionado, deseleciona
    if (this.selectedTemplateId === templateId) {
      this.clearSelection();
      return;
    }

    // Remove a classe 'selected' de todas as pílulas
    this.template.querySelectorAll(".template-pill").forEach((pill) => {
      pill.classList.remove("selected");
    });

    // Adiciona a classe 'selected' à pílula clicada
    pillElement.classList.add("selected");
    this.selectedTemplateId = templateId;

    // Se for a opção de template manual
    if (templateId === "manual") {
      this.isCustomTemplate = true;
      this.selectedTemplateText = this.customTemplateText;
    } else {
      this.isCustomTemplate = false;
      this.selectedTemplateText = pillElement.dataset.template;

      // Dispara o evento para informar que um template foi selecionado
      this.dispatchTemplateSelectedEvent();
    }
  }

  // Lidar com a alteração do texto do template personalizado
  handleCustomTemplateChange(event) {
    this.customTemplateText = event.target.value;
  }

  // Salvar o template personalizado
  handleSaveCustomTemplate() {
    if (this.customTemplateText && this.customTemplateText.trim() !== "") {
      this.selectedTemplateText = this.customTemplateText;
      this.isCustomTemplate = false;

      // Dispara o evento para informar que um template foi selecionado
      this.dispatchTemplateSelectedEvent();

      // Mostra feedback visual
      this.showToast(
        "Sucesso",
        "Template personalizado salvo com sucesso!",
        "success"
      );
    } else {
      this.showToast(
        "Aviso",
        "Por favor, digite um texto para o template.",
        "warning"
      );
    }
  }

  // Cancelar a edição do template personalizado
  handleCancelCustomTemplate() {
    const manualPill = this.template.querySelector(
      '.template-pill[data-id="manual"]'
    );
    if (manualPill) {
      manualPill.classList.remove("selected");
    }

    this.isCustomTemplate = false;
    this.selectedTemplateId = null;
    this.selectedTemplateText = "";
    this.customTemplateText = "";
  }

  // Método para limpar a seleção atual
  clearSelection() {
    this.template.querySelectorAll(".template-pill").forEach((pill) => {
      pill.classList.remove("selected");
    });

    this.selectedTemplateId = null;
    this.selectedTemplateText = "";
    this.isCustomTemplate = false;

    // Dispara o evento para informar que o template foi limpo
    this.dispatchTemplateSelectedEvent();
  }

  // Método para despachar o evento de template selecionado
  dispatchTemplateSelectedEvent() {
    // Envia apenas o texto do template como detail, para compatibilidade com o componente pai
    const templateSelectedEvent = new CustomEvent("templateselected", {
      detail: this.selectedTemplateText
    });

    this.dispatchEvent(templateSelectedEvent);
  }

  // Método para mostrar toast de notificação (requer importação)
  showToast(title, message, variant) {
    // Dispatch um evento para o componente pai mostrar o toast
    const toastEvent = new CustomEvent("showtoast", {
      detail: {
        title,
        message,
        variant
      }
    });

    this.dispatchEvent(toastEvent);
  }

  // API method para selecionar um template programaticamente
  @api
  selectTemplate(templateId) {
    const pillElement = this.template.querySelector(
      `.template-pill[data-id="${templateId}"]`
    );
    if (pillElement) {
      // Simula um clique na pílula
      const event = { currentTarget: pillElement };
      this.handleTemplatePillClick(event);
    }
  }

  // API method para limpar a seleção programaticamente
  @api
  clearTemplateSelection() {
    this.clearSelection();
  }
}