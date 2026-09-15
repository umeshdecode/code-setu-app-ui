import { Component, Inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DialogBoxData {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Confirm-button color. Defaults to 'danger' since most callers are delete confirmations. */
  variant?: 'danger' | 'primary';
}

@Component({
  selector: 'app-dialogbox',
  standalone: true,
  imports: [MatDialogModule],
  templateUrl: './dialogbox.component.html',
  styleUrls: ['./dialogbox.component.css']
})
export class DialogboxComponent {

  constructor(
    public dialogRef: MatDialogRef<DialogboxComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogBoxData
  ) { }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  get variant(): 'danger' | 'primary' {
    return this.data.variant || 'danger';
  }

}
