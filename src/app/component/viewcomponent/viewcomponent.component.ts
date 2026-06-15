import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ViewDetailItem {
  label: string;
  value: any;
  type?: 'text' | 'email' | 'link' | 'status';
}

export interface ViewDialogData {
  title: string;
  details: ViewDetailItem[];
}

@Component({
  selector: 'app-viewcomponent',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './viewcomponent.component.html',
  styleUrls: ['./viewcomponent.component.css']
})
export class ViewcomponentComponent {
  constructor(
    public dialogRef: MatDialogRef<ViewcomponentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ViewDialogData
  ) {}
}
