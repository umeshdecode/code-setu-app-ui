import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ShowpopupService } from 'src/app/services/showpopup.service';
import { TemplateService } from 'src/app/services/template.service';

@Component({
  selector: 'app-quotaion',
  templateUrl: './quotaion.component.html',
  styleUrls: ['./quotaion.component.css']
})
export class QuotaionComponent implements OnInit {
  templateForm!: FormGroup;
  selectedTemplateFile: File | null = null;
  selectedTemplateFileName = '';
  isUploading = false;

  templateTypes = ['None','QUOTATION','PACKING_LIST','INVOICE','RECEIPT'];

  constructor(
    private fb: FormBuilder,
    private templateService: TemplateService,
    private showpopup: ShowpopupService
  ) { }

  ngOnInit(): void {
    this.buildForms();
  }

  buildForms(): void {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      type: ['QUOTATION', Validators.required],
      isActive: [true],
      file: [null, Validators.required]
    });

  }

  onTemplateFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.selectedTemplateFile = file;
    this.selectedTemplateFileName = file?.name || '';
    this.templateForm.patchValue({ file });
    this.templateForm.get('file')?.markAsTouched();
    this.templateForm.get('file')?.updateValueAndValidity();
  }

  clearTemplateFile(): void {
    this.selectedTemplateFile = null;
    this.selectedTemplateFileName = '';
    this.templateForm.patchValue({ file: null });
    this.templateForm.get('file')?.updateValueAndValidity();
  }

  createTemplate(): void {
    if (this.templateForm.invalid || !this.selectedTemplateFile) {
      this.templateForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    const templatePayload = [{
      name: this.templateForm.value.name,
      type: this.templateForm.value.type,
      isActive: this.templateForm.value.isActive
    }];

    formData.append('file', this.selectedTemplateFile, this.selectedTemplateFile.name);
    formData.append('data', JSON.stringify(templatePayload));

    this.isUploading = true;
    this.templateService.createTemplate(formData).subscribe({
      next: (response: any) => {
        this.showResponse(response, 'Template created successfully');
        this.templateForm.reset({
          type: 'QUOTATION',
          isActive: true
        });
        this.clearTemplateFile();
        this.isUploading = false;
      },
      error: (error) => {
        console.error(error);
        this.showpopup.showError('Unable to create template');
        this.isUploading = false;
      }
    });
  }

  private showResponse(response: any, fallbackMessage: string): void {
    if (response?.responseMessege || response?.responseCode) {
      this.showpopup.showResponsePopup(response.responseMessege || fallbackMessage, response.responseCode || 200);
      return;
    }

    this.showpopup.showSuccess(fallbackMessage);
  }

}
