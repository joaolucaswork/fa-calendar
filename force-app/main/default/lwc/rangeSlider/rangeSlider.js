import { LightningElement, api } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import rangeSliderElement from '@salesforce/resourceUrl/rangeSlider';
import rangeSliderCompat from '@salesforce/resourceUrl/rangeSliderElementCompat';
import rangeSliderCustom from '@salesforce/resourceUrl/rangeSliderElementCustom';

// Função para debug
function debug(message, data) {
    console.log(`[RangeSlider Debug] ${message}`, data || '');
}

export default class RangeSlider extends LightningElement {
    isLibLoaded = false;
    sliderEl;
    
    // Valores de probabilidade específicos
    probabilityValues = [0, 13, 34, 55, 89, 100];
    
    @api value;
    @api disabled = false;
    @api
    get formattedValue() {
        return this.value ? this.value.toString() : '0';
    }

    renderedCallback() {
        if (this.isLibLoaded) {
            return;
        }
        debug('Loading resources');
        Promise.all([
            loadScript(this, rangeSliderElement),
            loadStyle(this, rangeSliderCompat),
            loadStyle(this, rangeSliderCustom)
        ])
        .then(() => {
            this.isLibLoaded = true;
            debug('Resources loaded successfully');
            this.renderSlider();
        })
        .catch(error => {
            debug('Error loading resources', error);
            console.error(error);
        });
    }

    renderSlider() {
        if (!this.sliderEl) {
            debug('Iniciando renderização do slider');
            const container = this.template.querySelector('.slider-container');
            if (!container) {
                debug('ERRO: Container do slider não encontrado!');
                return;
            }
            
            debug('Criando elemento range-slider');
            this.sliderEl = document.createElement('range-slider');
            this.sliderEl.setAttribute('id', 'probability-slider');
            this.sliderEl.min = 0;
            this.sliderEl.max = 100;
            
            // Configurando para usar os valores específicos
            // O step será ignorado já que usaremos ticks personalizados
            this.sliderEl.step = 1;
            
            // Definir o valor inicial com base na propriedade value ou o primeiro valor
            const initialValue = this.findClosestProbabilityValue(this.value || 0);
            debug('Valor inicial calculado', initialValue);
            
            // Definindo o valor do slider e verificando se foi aplicado
            this.sliderEl.value = initialValue;
            debug('Valor definido no slider', this.sliderEl.value);
            
            // Verificando se o atributo value também foi definido no elemento HTML
            setTimeout(() => {
                debug('Verificando atributo value do elemento', this.sliderEl.getAttribute('value'));
                debug('Verificando se o slider tem os seletores CSS necessários');
                const thumbEl = this.sliderEl.querySelector('[data-thumb]');
                const trackFillEl = this.sliderEl.querySelector('[data-track-fill]');
                debug('Elemento thumb encontrado', thumbEl ? 'Sim' : 'Não');
                debug('Elemento track-fill encontrado', trackFillEl ? 'Sim' : 'Não');
                
                // Tentar forçar a atualização do atributo value
                this.sliderEl.setAttribute('value', initialValue.toString());
                debug('Atributo value definido manualmente', this.sliderEl.getAttribute('value'));
            }, 100);
            
            // Desabilitar o slider se necessário
            if (this.disabled) {
                this.sliderEl.disabled = true;
                debug('Slider desabilitado');
            }
            
            debug('Adicionando event listeners');
            this.sliderEl.addEventListener('input', this.handleInput.bind(this));
            this.sliderEl.addEventListener('change', this.handleChange.bind(this));
            
            debug('Adicionando slider ao container');
            container.appendChild(this.sliderEl);
            
            // Aplicar estilos para os ticks específicos
            this.setupCustomTicks();
            
            // Log do elemento DOM completo
            setTimeout(() => {
                debug('DOM do slider', container.innerHTML);
                debug('Estilos computados', window.getComputedStyle(this.sliderEl));
            }, 200);
        }
    }

    handleInput(event) {
        const rawValue = Number(event.target.value);
        debug('Valor bruto do input', rawValue);
        
        // Encontrar o valor mais próximo dentro dos valores de probabilidade
        const closestValue = this.findClosestProbabilityValue(rawValue);
        debug('Valor mais próximo encontrado', closestValue);
        
        // Atualizar o slider para o valor mais próximo
        if (this.sliderEl && this.sliderEl.value != closestValue) {
            debug('Atualizando valor do slider para', closestValue);
            this.sliderEl.value = closestValue;
            
            // Forçar a atualização do atributo value para acionar os seletores CSS
            this.sliderEl.setAttribute('value', closestValue.toString());
            debug('Atributo value definido manualmente', this.sliderEl.getAttribute('value'));
            
            // Verificar se os estilos CSS foram aplicados corretamente
            setTimeout(() => {
                const thumbEl = this.sliderEl.querySelector('[data-thumb]');
                if (thumbEl) {
                    debug('Cor de fundo do thumb', window.getComputedStyle(thumbEl).backgroundColor);
                }
                const trackFillEl = this.sliderEl.querySelector('[data-track-fill]');
                if (trackFillEl) {
                    debug('Cor de fundo do track-fill', window.getComputedStyle(trackFillEl).backgroundColor);
                }
            }, 50);
        }
        
        // Disparar evento de atualização com o valor ajustado
        this.value = closestValue;
        debug('Valor final atualizado', this.value);
        this.dispatchEvent(new CustomEvent('valuechange', {
            detail: {
                value: closestValue
            },
            bubbles: true
        }));
    }
    
    handleChange(event) {
        // Este evento é disparado quando o usuário termina de interagir com o slider
        const value = this.findClosestProbabilityValue(Number(event.target.value));
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                value: value
            },
            bubbles: true
        }));
    }
    
    findClosestProbabilityValue(value) {
        const numValue = Number(value);
        debug('Calculando valor mais próximo para', numValue);
        
        if (this.probabilityValues.includes(numValue)) {
            debug('Valor exato encontrado na lista', numValue);
            return numValue;
        }
        
        // Encontra o valor mais próximo entre os valores definidos
        const closestValue = this.probabilityValues.reduce((prev, curr) => {
            return (Math.abs(curr - numValue) < Math.abs(prev - numValue)) ? curr : prev;
        });
        
        debug('Valor mais próximo calculado', closestValue);
        return closestValue;
    }
    
    @api
    setValue(value) {
        if (this.sliderEl) {
            const adjustedValue = this.findClosestProbabilityValue(Number(value));
            this.sliderEl.value = adjustedValue;
            this.value = adjustedValue;
        }
    }
    
    @api
    setDisabled(disabled) {
        if (this.sliderEl) {
            this.sliderEl.disabled = disabled;
            this.disabled = disabled;
        }
    }
    
    setupCustomTicks() {
        debug('Configurando ticks personalizados');
        
        // Adicionando marcadores de texto para cada valor de probabilidade
        if (this.sliderEl) {
            // Verificar se os seletores CSS estão funcionando
            setTimeout(() => {
                // Tentar atualizar manualmente as cores
                const thumbElement = this.sliderEl.querySelector('[data-thumb]');
                const trackFillElement = this.sliderEl.querySelector('[data-track-fill]');
                
                if (thumbElement && trackFillElement) {
                    debug('Elementos thumb e track-fill encontrados, verificando estilos');
                    
                    // Verificar pseudoelementos
                    const sliderStyles = window.getComputedStyle(this.sliderEl);
                    debug('Pseudoelemento ::before', sliderStyles.getPropertyValue('content'));
                    debug('Pseudoelemento ::after', sliderStyles.getPropertyValue('content'));
                    
                    // Verificar se os seletores de atributo estão funcionando
                    const value = this.sliderEl.getAttribute('value');
                    debug('Atributo value no elemento', value);
                    
                    // Se o atributo value não estiver presente ou não estiver correto, definir manualmente
                    if (!value || value !== this.sliderEl.value.toString()) {
                        this.sliderEl.setAttribute('value', this.sliderEl.value.toString());
                        debug('Corrigido atributo value manualmente', this.sliderEl.getAttribute('value'));
                    }
                } else {
                    debug('AVISO: Elementos thumb ou track-fill não encontrados');
                }
            }, 300);
        }
    }
}