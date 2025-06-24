import { LightningElement, track, api } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

export default class WhatsappMessageTemplate extends LightningElement {
  @track messageTemplate =
    "Olá {leadName}, tudo bem?\n\nMe chamo {userName} e sou SDR da Reino Capital, gostaria de saber mais sobre nossa cartela de produtos?";
  @track isEditing = false;
  @api saveToLocalStorage = false;

  connectedCallback() {
    // Tenta carregar o template salvo do localStorage
    this.loadTemplateFromStorage();
  }

  loadTemplateFromStorage() {
    try {
      const savedTemplate = localStorage.getItem("whatsappMessageTemplate");
      if (savedTemplate) {
        this.messageTemplate = savedTemplate;
      }
    } catch (error) {
      console.error("Erro ao carregar template de mensagem:", error);
    }
  }

  saveTemplateToStorage() {
    try {
      if (this.saveToLocalStorage) {
        localStorage.setItem("whatsappMessageTemplate", this.messageTemplate);
      }
    } catch (error) {
      console.error("Erro ao salvar template de mensagem:", error);
    }
  }

  handleEdit() {
    this.isEditing = true;
  }

  handleCancel() {
    this.isEditing = false;
    this.loadTemplateFromStorage();
  }
  handleSave() {
    this.isEditing = false;
    this.saveTemplateToStorage();
    this.dispatchEvent(
      new CustomEvent("templateupated", {
        detail: {
          template: this.messageTemplate
        }
      })
    );
    this.showToast(
      "Sucesso",
      "Template de mensagem atualizado com sucesso!",
      "success"
    );
  }

  handleTemplateChange(event) {
    this.messageTemplate = event.target.value;
  }

  @api
  getMessageTemplate() {
    return this.messageTemplate;
  }

  @api
  formatMessage(leadName, userName) {
    return this.messageTemplate
      .replace(/{leadName}/g, leadName || "{leadName}")
      .replace(/{userName}/g, userName || "{userName}");
  }

  showToast(title, message, variant) {
    this.dispatchEvent(
      new ShowToastEvent({
        title,
        message,
        variant
      })
    );
  }
}