import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-viewcomponent',
  templateUrl: './viewcomponent.component.html',
  styleUrls: ['./viewcomponent.component.css']
})
export class ViewcomponentComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<ViewcomponentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; details: { label: string; value: any; type?: string }[] }
  ) { }

  ngOnInit(): void { }

  close(): void {
    this.dialogRef.close();
  }
}
