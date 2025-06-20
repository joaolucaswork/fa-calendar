import { LightningElement, api, track } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { NavigationMixin } from "lightning/navigation";
import getOpportunityDetails from "@salesforce/apex/OpportunityManager.getOpportunityDetails";
import updateOpportunity from "@salesforce/apex/OpportunityManager.updateOpportunity";
import getProbabilityPicklistValues from "@salesforce/apex/WelcomeScreen.getPicklistValues";

export default class OpportunityEditor extends NavigationMixin(
  LightningElement
) {
  @api opportunityId;
  @api showModal = false;

  @track opportunityDetails = null;
  @track stageOptions = [];
  @track typeOptions = [];
  @track isLoading = false;
  @track opportunityError = null;
  @track opportunityAmount = null;
  @track opportunityCloseDate = null;
  @track opportunityName = null;
  @track opportunityStageName = null;
  @track opportunityDescription = null;
  @track opportunityType = null;
  @track opportunityTypeApiValue = null;
  @track opportunityProbability = null;

  // Mapeamento de valores do slider para opções de probabilidade
  probabilityOptions = [
    { value: 0, apiName: 'zero', displayValue: '0%', numericValue: 0 },
    { value: 13, apiName: 'treze', displayValue: '13%', numericValue: 13 },
    { value: 34, apiName: 'trintaequatro', displayValue: '34%', numericValue: 34 },
    { value: 55, apiName: 'cinquentaecinco', displayValue: '55%', numericValue: 55 },
    { value: 89, apiName: 'oitentaenove', displayValue: '89%', numericValue: 89 },
    { value: 100, apiName: 'cem', displayValue: '100%', numericValue: 100 }
  ];

  // Getters para as classes dos cards de tipo
  get liquidacaoOtimizadaClass() {
    return this.opportunityType === "Liquidação Otimizada" 
      ? "type-card selected" 
      : "type-card";
  }

  get consultoriaSocietariaClass() {
    return this.opportunityType === "Consultoria Societária" 
      ? "type-card selected" 
      : "type-card";
  }

  get gestaoPatrimonioClass() {
    return this.opportunityType === "Gestão de Patrimônio" 
      ? "type-card selected" 
      : "type-card";
  }
  
  // Getter para o valor numérico da probabilidade para o range slider
  get opportunityProbabilityNumericValue() {
    if (!this.opportunityProbability) return 0;
    
    // Encontrar o valor numérico correspondente ao apiName atual
    const option = this.probabilityOptions.find(opt => opt.apiName === this.opportunityProbability);
    return option ? option.numericValue : 0;
  }
  
  // Getter para exibir o valor de probabilidade selecionado
  get probabilityDisplayValue() {
    if (!this.opportunityProbability) return this.probabilityOptions[0].displayValue;
    
    const option = this.probabilityOptions.find(opt => opt.apiName === this.opportunityProbability);
    return option ? option.displayValue : this.probabilityOptions[0].displayValue;
  }

  // Método para detectar o valor de API com base no tipo exibido no registro
  getApiValueFromDisplayType(displayType) {
    // Mapear o tipo exibido para o valor de API esperado pelo flow
    if (!displayType) return null;
    
    // Verificar possíveis formatos e correspondências
    if (displayType.includes('Liquidação') || displayType === 'liquidacaoOtimizada') {
      return 'liquidacaoOtimizada';
    } else if (displayType.includes('Consultoria') || displayType === 'consultoriaSocietaria') {
      return 'consultoriaSocietaria';
    } else if (displayType.includes('Gestão') || displayType === 'gestaoPatrimonio') {
      return 'gestaoPatrimonio';
    }
    
    return null;
  }

  // Observar mudanças no ID da oportunidade para carregar detalhes
  @api
  set recordId(value) {
    this.opportunityId = value;
    console.log("OpportunityEditor - ID definido:", value);
    if (this.opportunityId) {
      this.fetchOpportunityDetails();
    }
  }

  get recordId() {
    return this.opportunityId;
  }

  // Observar mudanças na visibilidade do modal
  @api
  set isOpen(value) {
    this.showModal = value;
    console.log("OpportunityEditor - Modal visibilidade:", value);
    if (value && this.opportunityId) {
      // Se o modal é aberto e temos um ID, buscar os detalhes
      this.fetchOpportunityDetails();
    }
  }

  get isOpen() {
    return this.showModal;
  }
  
  // Inicialização do componente
  connectedCallback() {
    // Adicionar um ouvinte para o evento de mudança de probabilidade para atualizar a pílula selecionada
    this.addEventListener('probabilitychanged', () => {
      // Atualizar a pílula selecionada sempre que a probabilidade mudar
      if (this.opportunityProbability) {
        // Pequeno timeout para garantir que o DOM está pronto
        setTimeout(() => {
          this.updateTemplateSelection();
        }, 50);
      }
    });
  }

  // Método para buscar valores da picklist de probabilidade
  async loadProbabilityPicklistValues() {
    try {
      const picklistResult = await getProbabilityPicklistValues({
        objectName: 'Opportunity',
        picklistFields: ['Probabilidade_da_Oportunidade__c']
      });
      
      console.log('Valores de picklist carregados:', JSON.stringify(picklistResult));
      
      // Se precisar ajustar o mapeamento com base nos valores do servidor, faça aqui
    } catch (error) {
      console.error('Erro ao carregar valores de picklist:', error);
    }
  }

  // Método para buscar detalhes da oportunidade
  async fetchOpportunityDetails() {
    if (!this.opportunityId) {
      console.log(
        "OpportunityEditor - Sem ID de oportunidade, não é possível buscar detalhes"
      );
      return;
    }

    try {
      this.isLoading = true;
      console.log(
        "OpportunityEditor - Buscando detalhes da oportunidade:",
        this.opportunityId
      );

      const result = await getOpportunityDetails({
        opportunityId: this.opportunityId
      });

      console.log(
        "OpportunityEditor - Detalhes da oportunidade recebidos:",
        JSON.stringify(result)
      );

      if (result.opportunity) {
        // Processar os dados da oportunidade recebidos
        this.opportunityDetails = result.opportunity;

        // Armazenar valores individuais para edição
        this.opportunityAmount = result.opportunity.Amount;
        this.opportunityCloseDate = result.opportunity.CloseDate;
        this.opportunityName = result.opportunity.Name;
        this.opportunityStageName = result.opportunity.StageName;
        this.opportunityDescription = result.opportunity.Description;
        
        // Definir valores padrão para campos que podem estar ausentes na resposta
        if (!result.opportunity.Type) {
          // Se o tipo estiver ausente, definir um valor padrão para evitar erros
          this.opportunityType = "Liquidação Otimizada";
          this.opportunityTypeApiValue = "liquidacaoOtimizada";
        } else {
          this.opportunityType = result.opportunity.Type;
          this.opportunityTypeApiValue = this.getApiValueFromDisplayType(this.opportunityType);
        }
        console.log("Oportunidade carregada com tipo:", this.opportunityType);
        console.log("Tipo API detectado:", this.opportunityTypeApiValue);
        
        // Armazenar a probabilidade da oportunidade
        this.opportunityProbability = result.opportunity.Probabilidade_da_Oportunidade__c || "zero";
        console.log("Probabilidade da oportunidade:", this.opportunityProbability);
        
        this.stageOptions = result.stageOptions || [];
        this.typeOptions = result.typeOptions || [];
        this.opportunityError = null;
      } else {
        this.opportunityError =
          result.error || "Não foi possível carregar os detalhes da oportunidade";
      }
    } catch (error) {
      console.error(
        "OpportunityEditor - Erro ao buscar detalhes da oportunidade:",
        error
      );
      this.opportunityError =
        error.message || "Erro ao carregar detalhes da oportunidade";
    } finally {
      this.isLoading = false;
    }
  }

  // Método para fechar o modal da oportunidade
  closeModal() {
    console.log("OpportunityEditor - Fechando modal");
    this.showModal = false;
    this.dispatchEvent(new CustomEvent("close"));
  }

  // Método para atualizar valores da oportunidade no formulário
  handleFieldChange(event) {
    const field = event.target.name;
    const value = event.target.value;

    switch (field) {
      case "opportunityName":
        this.opportunityName = value;
        break;
      case "opportunityAmount":
        this.opportunityAmount = value;
        break;
      case "opportunityCloseDate":
        this.opportunityCloseDate = value;
        break;
      case "opportunityStageName":
        this.opportunityStageName = value;
        break;
      case "opportunityDescription":
        this.opportunityDescription = value;
        break;
      // Caso do input de probabilidade removido, agora gerido pelo slider
    }
  }

  // Método para lidar com clique nos cards de tipo
  handleTypeCardClick(event) {
    // Obter o tipo selecionado do atributo data-type do card
    const displayType = event.currentTarget.dataset.type;
    this.opportunityType = displayType;
    
    // Mapear o valor de exibição para o valor de API que o flow espera
    this.opportunityTypeApiValue = this.getTypeApiValue(displayType);
    console.log('Tipo selecionado:', this.opportunityType, 'API Value:', this.opportunityTypeApiValue);
  }
  
  // Método para converter o tipo de exibição para o valor de API esperado pelo flow
  getTypeApiValue(displayType) {
    const typeMapping = {
      'Liquidação Otimizada': 'liquidacaoOtimizada',
      'Consultoria Societária': 'consultoriaSocietaria',
      'Gestão de Patrimônio': 'gestaoPatrimonio'
    };
    
    return typeMapping[displayType] || '';
  }

  // Método para lidar com mudanças no novo range slider (durante a movimentação)
  handleRangeSliderChange(event) {
    const numericValue = event.detail.value;
    console.log('Range slider value changed:', numericValue);
    
    // Encontrar a opção de probabilidade mais próxima do valor numérico
    const option = this.findClosestProbabilityOption(numericValue);
    if (option) {
      // Se encontrar uma opção válida, definir o valor da API
      const previousProbability = this.opportunityProbability;
      this.opportunityProbability = option.apiName;
      
      // Animar a mudança de valor se necessário
      this.animateSelectedValue();
      
      // Definir todos os valores numéricos para consistência
      const numValue = parseInt(option.numericValue);
      this.probabilityNumericValue = numValue;
      
      // Se a probabilidade mudou, destacar a pílula correspondente
      if (previousProbability !== this.opportunityProbability) {
        this.updateTemplateSelection();
      }
    }
  }
  
  // Método para atualizar a seleção de template baseado na probabilidade atual
  updateTemplateSelection() {
    // Pequeno timeout para garantir que o DOM está pronto
    setTimeout(() => {
      // Limpar a classe 'selected' de todas as pílulas
      const allPills = this.template.querySelectorAll('.message-pill');
      allPills.forEach(pill => {
        pill.classList.remove('selected');
      });
      
      // Destacar a pílula correspondente à probabilidade atual
      if (this.opportunityProbability) {
        const highlightPill = this.template.querySelector(`.message-pill[data-value="${this.opportunityProbability}"]`);
        if (highlightPill) {
          highlightPill.classList.add('selected');
          
          // Aplicar o texto do template automaticamente
          const templateText = highlightPill.dataset.template;
          if (templateText) {
            this.opportunityDescription = templateText;
            
            // Aplicar efeito de destaque no campo de descrição
            this.highlightDescriptionField();
          }
          
          // Scrollar a pílula para a visão se não estiver visível
          const pillsWrapper = this.template.querySelector('.pills-wrapper');
          if (pillsWrapper) {
            const pillRect = highlightPill.getBoundingClientRect();
            const wrapperRect = pillsWrapper.getBoundingClientRect();
            
            // Verificar se a pílula está fora da área visível
            if (pillRect.left < wrapperRect.left || pillRect.right > wrapperRect.right) {
              // Calcula a posição de scroll para centralizar a pílula
              const scrollLeft = highlightPill.offsetLeft - (pillsWrapper.clientWidth / 2) + (highlightPill.clientWidth / 2);
              pillsWrapper.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
          }
        }
      }
    }, 10);
  }
  
  // Método para lidar com o evento final do range slider (quando o usuário solta o controle)
  handleRangeSliderFinalChange(event) {
    const numericValue = event.detail.value;
    console.log('Range Slider valor final:', numericValue);
    
    // Encontrar a opção que corresponde ao valor numérico mais próximo
    const option = this.findClosestProbabilityOption(numericValue);
    if (option) {
      console.log('Valor de API final selecionado:', option.apiName, 'Display:', option.displayValue);
      this.opportunityProbability = option.apiName;
      
      // Atualizar a seleção de template baseado na nova probabilidade
      this.updateTemplateSelection();
    } else {
      console.error('Nenhuma opção encontrada para o valor final do slider:', numericValue);
    }
  }
  
  // Método para encontrar a opção de probabilidade mais próxima do valor numérico
  findClosestProbabilityOption(numericValue) {
    if (!numericValue && numericValue !== 0) return null;
    
    // Verificar se o valor corresponde exatamente a uma opção
    let option = this.probabilityOptions.find(opt => opt.numericValue === numericValue);
    if (option) return option;
    
    // Caso contrário, encontrar o valor mais próximo
    let closestOption = this.probabilityOptions[0];
    let minDifference = Math.abs(closestOption.numericValue - numericValue);
    
    for (let i = 1; i < this.probabilityOptions.length; i++) {
      const difference = Math.abs(this.probabilityOptions[i].numericValue - numericValue);
      if (difference < minDifference) {
        minDifference = difference;
        closestOption = this.probabilityOptions[i];
      }
    }
    
    return closestOption;
  }
  
  // Método para animar a mudança do valor selecionado
  animateSelectedValue() {
    // Encontrar o elemento para animar
    const element = this.template.querySelector('.highlight-value');
    if (element) {
      // Remover a classe para reiniciar a animação
      element.classList.remove('highlight-value');
      // Forçar um reflow para reiniciar a animação
      void element.offsetWidth;
      // Adicionar a classe novamente para iniciar a animação
      element.classList.add('highlight-value');
    }
  }

  // Método para salvar as atualizações da oportunidade
  async saveOpportunity() {
    if (!this.opportunityId) return;

    try {
      this.isLoading = true;
      console.log(
        "OpportunityEditor - Salvando oportunidade:",
        this.opportunityId
      );

      console.log("Valor da probabilidade antes de enviar:", this.opportunityProbability);
      console.log("Tipo exibido:", this.opportunityType, "Tipo API:", this.opportunityTypeApiValue);
      
      const result = await updateOpportunity({
        opportunityId: this.opportunityId,
        name: this.opportunityName,
        stageName: this.opportunityStageName,
        amount: this.opportunityAmount,
        closeDate: this.opportunityCloseDate,
        description: this.opportunityDescription,
        type: this.opportunityTypeApiValue, // Usar o valor de API em vez do valor de exibição
        probabilidade: this.opportunityProbability || ''
      });

      console.log(
        "OpportunityEditor - Resultado da atualização:",
        JSON.stringify(result)
      );

      if (result.success) {
        this.showToast(
          "Sucesso",
          "Oportunidade atualizada com sucesso",
          "success"
        );
        this.closeModal();

        // Disparar evento de atualização bem-sucedida
        this.dispatchEvent(
          new CustomEvent("update", {
            detail: {
              opportunityId: this.opportunityId
            }
          })
        );
      } else {
        this.showToast(
          "Erro",
          result.error || "Erro ao atualizar oportunidade",
          "error"
        );
      }
    } catch (error) {
      console.error("OpportunityEditor - Erro ao salvar oportunidade:", error);
      this.showToast(
        "Erro",
        error.message || "Erro ao atualizar oportunidade",
        "error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  // Método para navegar para a oportunidade
  navigateToOpportunity() {
    if (this.opportunityId) {
      console.log(
        "OpportunityEditor - Navegando para oportunidade:",
        this.opportunityId
      );
      this[NavigationMixin.Navigate]({
        type: "standard__recordPage",
        attributes: {
          recordId: this.opportunityId,
          objectApiName: "Opportunity",
          actionName: "view"
        }
      });
    }
  }

  // Método para mostrar mensagens toast
  showToast(title, message, variant) {
    const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    });
    this.dispatchEvent(evt);
  }

  // Método para controlar a abertura/fechamento do acordeão personalizado
  toggleAccordion(event) {
    const header = event.currentTarget;
    const sectionName = header.dataset.name;
    const content = this.template.querySelector(`.custom-accordion-content[data-name="${sectionName}"]`);
    
    // Alterna classes de ativo para o cabeçalho e conteúdo
    header.classList.toggle('active');
    content.classList.toggle('active');
    
    // Rotaciona o ícone
    const icon = header.querySelector('.custom-accordion-icon');
    if (header.classList.contains('active')) {
      // Acordeão está aberto, conteúdo visível
      icon.setAttribute('icon-name', 'utility:chevronup');
    } else {
      // Acordeão está fechado, conteúdo oculto
      icon.setAttribute('icon-name', 'utility:chevrondown');
    }
  }
  
  // Templates de descrição baseados na probabilidade da oportunidade
  descriptionTemplates = {
    zero: "Oportunidade registrada apenas para referência. Apesar do contato inicial com o cliente, foi identificado que não há interesse ou necessidade imediata pelos serviços de [tipo]. Razões principais: [preencher].",
    
    treze: "Primeiro contato realizado com sucesso. Cliente demonstrou interesse inicial nos serviços de [tipo]. Foi enviado material institucional e agendada reunião para apresentação detalhada. Potenciais necessidades identificadas: [preencher].",
    
    trintaequatro: "Cliente qualificado. Durante a reunião, foram identificadas as seguintes necessidades: [preencher]. Proposta em elaboração com foco em [principais pontos]. Próximos passos incluem apresentação da solução em [data estimada].",
    
    cinquentaecinco: "Proposta apresentada e aceita conceitualmente pelo cliente. Principais pontos acordados: [listar]. Aguardando definição de detalhes contratuais e operação. Cliente expressou satisfação com os termos gerais e prazo de implementação.",
    
    oitentaenove: "Contrato em fase final de elaboração. Todos os principais termos já foram acordados. Equipe jurídica do cliente está revisando a documentação. Assinatura prevista para [data estimada]. Time de implementação já foi alertado sobre o novo projeto.",
    
    cem: "Negócio fechado. Contrato assinado em [data] para [serviço contratado]. Valor total de [valor], com implementação a ser iniciada em [data]. Principais contatos no cliente: [nomes e cargos]. Observações adicionais: [preencher se necessário]."
  }
  
  // Método para lidar com o clique nas pílulas de template
  handleTemplateCardClick(event) {
    // Obter o valor do template do atributo data-value
    const selectedTemplate = event.currentTarget.dataset.value;
    if (!selectedTemplate) return;
    
    // Limpar a classe 'selected' de todas as pílulas
    const allPills = this.template.querySelectorAll('.message-pill');
    allPills.forEach(pill => {
      pill.classList.remove('selected');
    });
    
    // Adicionar a classe 'selected' à pílula clicada
    event.currentTarget.classList.add('selected');
    
    // Buscar o template baseado na seleção
    const templateText = this.descriptionTemplates[selectedTemplate];
    
    // Personalizar o template com o tipo de oportunidade se disponível
    let finalText = templateText;
    if (this.opportunityType) {
      finalText = templateText.replace(/\[tipo\]/g, this.opportunityType);
    }
    
    // Atualizar a descrição
    this.opportunityDescription = finalText;
    
    // Adicionar efeito de destaque ao textarea
    setTimeout(() => {
      const textarea = this.template.querySelector('lightning-textarea');
      if (textarea) {
        const textareaElement = textarea.querySelector('textarea');
        if (textareaElement) {
          textareaElement.classList.add('textarea-highlight');
          // Remover a classe após a animação terminar
          setTimeout(() => {
            textareaElement.classList.remove('textarea-highlight');
          }, 2000);
        }
      }
    }, 100);
  }
}