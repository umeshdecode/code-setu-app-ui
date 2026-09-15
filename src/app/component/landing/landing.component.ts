import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { PlanscreenComponent } from '../planscreen/planscreen.component';
import { ContectUsComponent } from '../contect-us/contect-us.component';
import { HeroTruck3dComponent } from '../hero-truck-3d/hero-truck-3d.component';
import { ScrollRevealDirective } from 'src/app/directives/scroll-reveal.directive';
import { Tilt3dDirective } from 'src/app/directives/tilt-3d.directive';

interface Pillar {
  icon: string;
  title: string;
  body: string;
  target: string;
}

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

interface Industry {
  icon: string;
  label: string;
}

interface ValueProp {
  icon: string;
  title: string;
  body: string;
}

interface Faq {
  q: string;
  a: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    PlanscreenComponent,
    ContectUsComponent,
    HeroTruck3dComponent,
    ScrollRevealDirective,
    Tilt3dDirective,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
})
export class LandingComponent {
  readonly pillars: Pillar[] = [
    {
      icon: 'request_quote',
      title: 'Operations',
      body: 'Build quotations in minutes, convert them into trips, and assign vehicles and drivers without a single spreadsheet.',
      target: '#lp-feature-operations',
    },
    {
      icon: 'receipt_long',
      title: 'Documentation',
      body: 'Bilty, invoices and receipts generated from the same trip data — GST-ready, shareable as PDF the moment they are made.',
      target: '#lp-feature-documents',
    },
    {
      icon: 'local_shipping',
      title: 'Fleet & People',
      body: 'Vehicles, drivers, staff and customers in one master. Role-based access decides exactly who sees what.',
      target: '#lp-feature-fleet',
    },
  ];

  readonly stats: Stat[] = [
    { value: 10000, suffix: '+', label: 'Documents generated' },
    { value: 500, suffix: '+', label: 'Vehicles managed' },
    { value: 24, suffix: '×7', label: 'Support availability' },
    { value: 8, suffix: '+', label: 'Modules in one workspace' },
    { value: 100, suffix: '%', label: 'Browser based' },
    { value: 2, suffix: ' min', label: 'To raise a quotation' },
  ];

  readonly industries: Industry[] = [
    { icon: 'local_shipping', label: 'Full Truck Load' },
    { icon: 'inventory_2', label: 'Part Load' },
    { icon: 'home_work', label: 'Packers & Movers' },
    { icon: 'ac_unit', label: 'Cold Chain' },
    { icon: 'local_post_office', label: 'Courier & Parcel' },
    { icon: 'view_in_ar', label: 'Container' },
    { icon: 'propane_tank', label: 'Bulk & Tanker' },
    { icon: 'pin_drop', label: 'Last Mile' },
  ];

  readonly valueProps: ValueProp[] = [
    {
      icon: 'cloud_done',
      title: 'Nothing to install',
      body: 'Runs in the browser. Open it on the office desktop and finish the same job from a phone at the yard.',
    },
    {
      icon: 'admin_panel_settings',
      title: 'Built for a team',
      body: 'Add staff, accountants and drivers, then use roles and permissions to scope what each of them can reach.',
    },
    {
      icon: 'devices',
      title: 'Mobile and desktop',
      body: 'One responsive interface across phone, tablet and desktop — no separate app to keep in sync.',
    },
    {
      icon: 'lock',
      title: 'Your data stays yours',
      body: 'Every company is isolated behind its own account, protected by token-based authentication.',
    },
  ];

  readonly faqs: Faq[] = [
    {
      q: 'How long does it take to get started?',
      a: 'Sign up, create your company, and add your first vehicle and customer — most operators raise their first quotation on the same day. There is no setup call to book and nothing to install.',
    },
    {
      q: 'Can I bring across my existing customers and vehicles?',
      a: 'Yes. Customers, vehicles, drivers and staff are all maintained as masters inside Cargo Setu, so you can enter your existing records once and reuse them on every trip and document afterwards.',
    },
    {
      q: 'Are the invoices GST compliant?',
      a: 'Invoices carry the GST breakdown alongside the trip and line-item detail, and can be shared as PDF directly from the app.',
    },
    {
      q: 'Does it work when the network is patchy?',
      a: 'Cargo Setu is an online application, so a connection is needed to create or update records. Documents you have already generated can be downloaded as PDF and shared offline.',
    },
    {
      q: 'How many people can use one account?',
      a: 'Multiple staff members work under the same company account at once. What each of them can see and change is governed by the role you assign, so an accountant and a dispatcher do not share the same view.',
    },
    {
      q: 'What happens if I want to stop?',
      a: 'Plans run for the validity period you subscribed to and simply lapse at the end of it. Your generated documents remain downloadable as PDF.',
    },
  ];

  /** Index of the open FAQ item, or -1 when all are collapsed. */
  openFaq = -1;

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? -1 : index;
  }
}
