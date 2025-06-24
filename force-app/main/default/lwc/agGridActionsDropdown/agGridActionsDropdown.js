import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { deleteRecord } from 'lightning/uiRecordApi';

/**
 * AG-Grid Actions Dropdown Component
 * 
 * A reusable dropdown component that provides kanbanPerson-style actions
 * for AG-Grid cells. Includes view, edit, add task, and delete actions.
 * 
 * @author Reino Capital
 * @version 1.0
 */
export default class AgGridActionsDropdown extends NavigationMixin(LightningElement) {
    
    /**
     * Create an actions dropdown cell renderer
     * @param {Object} params - AG-Grid cell renderer parameters
     * @param {Function} onRefreshData - Callback to refresh data after actions
     * @returns {HTMLElement} - Rendered cell element
     */
    @api
    createActionsCellRenderer(params, onRefreshData) {
        if (!params.data) return "";

        const div = document.createElement("div");
        div.classList.add("actions-cell");
        div.style.cssText = `
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
        `;

        // Create dropdown menu container with kanbanPerson styling
        div.innerHTML = `
            <div class="actions-menu-container" style="position: relative;">
                <div class="slds-dropdown-trigger slds-dropdown-trigger_click">
                    <button class="slds-button slds-button_icon slds-button_icon-border-filled actions-menu-button"
                            title="Opções de ação"
                            data-record-id="${params.data.id}"
                            style="background: white; border: 1px solid #d8dde6; border-radius: 0.25rem;">
                        <span class="slds-button__icon" style="width: 1rem; height: 1rem; fill: #706e6b;">
                            ▼
                        </span>
                        <span class="slds-assistive-text">Mostrar menu</span>
                    </button>
                    <div class="slds-dropdown slds-dropdown_right actions-dropdown" 
                         style="display: none; position: absolute; top: 100%; right: 0; z-index: 9999; 
                                background: white; border: 1px solid #d8dde6; border-radius: 0.25rem; 
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1); min-width: 150px; margin-top: 2px;">
                        <ul class="slds-dropdown__list" role="menu" style="margin: 0; padding: 0.25rem 0; list-style: none;">
                            <li class="slds-dropdown__item" role="presentation">
                                <a href="javascript:void(0);" role="menuitem" class="slds-dropdown__link" 
                                   data-action="view" data-record-id="${params.data.id}"
                                   style="display: flex; align-items: center; padding: 0.5rem 0.75rem; text-decoration: none; 
                                          color: #181818; font-size: 0.875rem; line-height: 1.25rem;">
                                    <span class="action-icon" style="margin-right: 0.5rem; width: 1rem; height: 1rem; color: #706e6b;">👁</span>
                                    <span class="slds-truncate">Ver Detalhes</span>
                                </a>
                            </li>
                            <li class="slds-dropdown__item" role="presentation">
                                <a href="javascript:void(0);" role="menuitem" class="slds-dropdown__link" 
                                   data-action="edit" data-record-id="${params.data.id}"
                                   style="display: flex; align-items: center; padding: 0.5rem 0.75rem; text-decoration: none; 
                                          color: #181818; font-size: 0.875rem; line-height: 1.25rem;">
                                    <span class="action-icon" style="margin-right: 0.5rem; width: 1rem; height: 1rem; color: #706e6b;">✏</span>
                                    <span class="slds-truncate">Editar</span>
                                </a>
                            </li>
                            <li class="slds-has-divider_top-space" role="separator" style="border-top: 1px solid #e5e5e5; margin: 0.25rem 0;"></li>
                            <li class="slds-dropdown__item" role="presentation">
                                <a href="javascript:void(0);" role="menuitem" class="slds-dropdown__link" 
                                   data-action="task" data-record-id="${params.data.id}"
                                   style="display: flex; align-items: center; padding: 0.5rem 0.75rem; text-decoration: none; 
                                          color: #181818; font-size: 0.875rem; line-height: 1.25rem;">
                                    <span class="action-icon" style="margin-right: 0.5rem; width: 1rem; height: 1rem; color: #706e6b;">📋</span>
                                    <span class="slds-truncate">Adicionar Tarefa</span>
                                </a>
                            </li>
                            <li class="slds-has-divider_top-space" role="separator" style="border-top: 1px solid #e5e5e5; margin: 0.25rem 0;"></li>
                            <li class="slds-dropdown__item" role="presentation">
                                <a href="javascript:void(0);" role="menuitem" class="slds-dropdown__link" 
                                   data-action="delete" data-record-id="${params.data.id}"
                                   style="display: flex; align-items: center; padding: 0.5rem 0.75rem; text-decoration: none; 
                                          color: #c23934; font-size: 0.875rem; line-height: 1.25rem;">
                                    <span class="action-icon" style="margin-right: 0.5rem; width: 1rem; height: 1rem; color: #c23934;">🗑</span>
                                    <span class="slds-truncate">Excluir</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners with improved error handling
        const menuButton = div.querySelector(".actions-menu-button");
        const dropdown = div.querySelector(".actions-dropdown");
        const menuItems = div.querySelectorAll(".slds-dropdown__link");

        if (!menuButton || !dropdown) {
            console.error("Failed to create dropdown elements");
            return div;
        }

        // Add hover effects to menu items
        menuItems.forEach((item) => {
            item.addEventListener("mouseenter", () => {
                item.style.backgroundColor = "#f3f2f2";
            });
            item.addEventListener("mouseleave", () => {
                item.style.backgroundColor = "transparent";
            });
        });

        // Toggle dropdown on button click
        menuButton.addEventListener("click", (event) => {
            event.stopPropagation();
            event.preventDefault();
            
            console.log("Actions button clicked for record:", params.data.id);
            
            const isVisible = dropdown.style.display === "block";

            // Close all other dropdowns first
            this.closeAllActionDropdowns();

            // Toggle current dropdown
            if (isVisible) {
                dropdown.style.display = "none";
                console.log("Dropdown closed");
            } else {
                dropdown.style.display = "block";
                console.log("Dropdown opened");
            }
        });

        // Handle menu item clicks
        menuItems.forEach((item) => {
            item.addEventListener("click", (event) => {
                event.stopPropagation();
                event.preventDefault();
                
                const action = event.currentTarget.dataset.action;
                const recordId = event.currentTarget.dataset.recordId;
                
                console.log("Menu item clicked:", action, "for record:", recordId);

                // Close dropdown
                dropdown.style.display = "none";

                // Handle action with delay to ensure dropdown closes
                setTimeout(() => {
                    this.handleActionMenuSelect(action, recordId, params.data, onRefreshData);
                }, 100);
            });
        });

        return div;
    }

    /**
     * Close all action dropdowns
     */
    @api
    closeAllActionDropdowns() {
        const allDropdowns = document.querySelectorAll('.actions-dropdown');
        allDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }

    /**
     * Handle action menu selection
     * @param {string} action - The selected action
     * @param {string} recordId - The record ID
     * @param {Object} recordData - The full record data
     * @param {Function} onRefreshData - Callback to refresh data
     */
    handleActionMenuSelect(action, recordId, recordData, onRefreshData) {
        if (!recordId || !action) return;

        switch (action) {
            case "view":
                this.navigateToRecordDetail(recordId);
                break;
            case "edit":
                this.navigateToRecordEdit(recordId);
                break;
            case "task":
                this.handleAddTask(recordId);
                break;
            case "delete":
                this.handleDelete(recordId, recordData, onRefreshData);
                break;
            default:
                console.warn("Unknown action:", action);
                break;
        }
    }

    // Action handlers from kanbanPerson
    handleAddTask(recordId) {
        // Create a new task related to the opportunity
        this[NavigationMixin.Navigate]({
            type: "standard__objectPage",
            attributes: {
                objectApiName: "Task",
                actionName: "new"
            },
            state: {
                defaultFieldValues: `WhatId=${recordId}`,
                navigationLocation: "LOOKUP"
            }
        });
    }

    handleDelete(recordId, recordData, onRefreshData) {
        const recordName = recordData ? recordData.name : "Registro";

        // Confirm deletion
        if (confirm(`Tem certeza que deseja excluir "${recordName}"?`)) {
            // Use Lightning Data Service deleteRecord
            deleteRecord(recordId)
                .then(() => {
                    this.showToast(
                        "Sucesso",
                        `${recordName} foi excluído com sucesso.`,
                        "success"
                    );
                    // Refresh the data
                    if (onRefreshData) {
                        onRefreshData();
                    }
                })
                .catch((error) => {
                    this.showToast(
                        "Erro",
                        error.body?.message || "Erro ao excluir registro",
                        "error"
                    );
                    console.error("Erro ao excluir registro:", error);
                });
        }
    }

    // Navigation methods
    navigateToRecordDetail(recordId) {
        this[NavigationMixin.Navigate]({
            type: "standard__recordPage",
            attributes: {
                recordId: recordId,
                objectApiName: "Opportunity",
                actionName: "view"
            }
        });
    }

    navigateToRecordEdit(recordId) {
        this[NavigationMixin.Navigate]({
            type: "standard__recordPage",
            attributes: {
                recordId: recordId,
                objectApiName: "Opportunity",
                actionName: "edit"
            }
        });
    }

    // Utility methods
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: 'dismissible'
        });
        this.dispatchEvent(event);
    }
}