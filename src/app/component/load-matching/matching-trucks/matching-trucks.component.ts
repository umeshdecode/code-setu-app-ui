import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LoadMatch } from 'src/app/models/load-match';
import { LoadMatchingService } from 'src/app/services/load-matching.service';

@Component({
  selector: 'app-matching-trucks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './matching-trucks.component.html',
  styleUrls: ['./matching-trucks.component.css']
})
export class MatchingTrucksComponent implements OnInit {
  shipmentId!: number;
  matches: LoadMatch[] = [];
  isLoading = false;
  loadError = '';
  expandedId: number | null = null;

  // ── Per-row action state ─────────────────────────────────────────────
  actionErrors: { [loadMatchId: number]: string } = {};
  actionSuccess: { [loadMatchId: number]: string } = {};
  actionBusy: { [loadMatchId: number]: boolean } = {};
  rejectingId: number | null = null;
  rejectReason = '';

  constructor(private route: ActivatedRoute, private loadMatchingService: LoadMatchingService) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadMatches();
  }

  loadMatches(): void {
    this.isLoading = true;
    this.loadError = '';
    this.loadMatchingService.getMatchingTripsForShipment(this.shipmentId).subscribe({
      next: response => {
        this.matches = this.extract(response);
        this.actionErrors = {};
        this.actionSuccess = {};
        this.isLoading = false;
      },
      error: err => {
        console.error('Matching trips load failed:', err);
        this.loadError = 'Unable to load matching trucks for this shipment.';
        this.isLoading = false;
      }
    });
  }

  toggleDetails(loadMatchId: number | undefined): void {
    if (loadMatchId == null) return;
    this.expandedId = this.expandedId === loadMatchId ? null : loadMatchId;
    const match = this.matches.find(m => m.loadMatchId === loadMatchId);
    if (match && match.status === 'SUGGESTED') {
      this.loadMatchingService.markViewed(loadMatchId).subscribe({
        next: () => { match.status = 'VIEWED'; },
        error: err => console.error('Mark viewed failed:', err)
      });
    }
  }

  statusClass(status: string | undefined): string {
    return 'match-status-' + (status || 'suggested').toLowerCase();
  }

  scorePct(score: number | undefined): number {
    if (score == null) return 0;
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  // ── Actions ───────────────────────────────────────────────────────────
  canRequest(match: LoadMatch): boolean {
    return match.status === 'SUGGESTED' || match.status === 'VIEWED';
  }

  canAccept(match: LoadMatch): boolean {
    return match.status === 'REQUESTED';
  }

  canReject(match: LoadMatch): boolean {
    return match.status === 'SUGGESTED' || match.status === 'VIEWED' || match.status === 'REQUESTED';
  }

  requestMatch(match: LoadMatch): void {
    if (match.loadMatchId == null) return;
    const id = match.loadMatchId;
    this.clearMessages(id);
    this.actionBusy[id] = true;
    this.loadMatchingService.requestMatch(id).subscribe({
      next: () => {
        match.status = 'REQUESTED';
        this.actionBusy[id] = false;
      },
      error: err => {
        this.actionBusy[id] = false;
        this.actionErrors[id] = err.error?.responseMessege || err.error?.message || 'Unable to request this match.';
      }
    });
  }

  acceptMatch(match: LoadMatch): void {
    if (match.loadMatchId == null) return;
    const id = match.loadMatchId;
    this.clearMessages(id);
    this.actionBusy[id] = true;
    this.loadMatchingService.acceptMatch(id).subscribe({
      next: () => {
        match.status = 'ACCEPTED';
        this.actionBusy[id] = false;
        this.actionSuccess[id] = 'Match accepted. The shipment has been added to the trip manifest.';
      },
      error: err => {
        this.actionBusy[id] = false;
        this.actionErrors[id] = err.error?.responseMessege || err.error?.message || 'Unable to accept this match.';
      }
    });
  }

  startReject(loadMatchId: number | undefined): void {
    if (loadMatchId == null) return;
    this.rejectingId = loadMatchId;
    this.rejectReason = '';
  }

  cancelReject(): void {
    this.rejectingId = null;
    this.rejectReason = '';
  }

  confirmReject(match: LoadMatch): void {
    if (match.loadMatchId == null) return;
    const id = match.loadMatchId;
    this.clearMessages(id);
    this.actionBusy[id] = true;
    this.loadMatchingService.rejectMatch(id, this.rejectReason || undefined).subscribe({
      next: () => {
        match.status = 'REJECTED';
        match.rejectionReason = this.rejectReason || undefined;
        this.actionBusy[id] = false;
        this.rejectingId = null;
        this.rejectReason = '';
      },
      error: err => {
        this.actionBusy[id] = false;
        this.actionErrors[id] = err.error?.responseMessege || err.error?.message || 'Unable to reject this match.';
      }
    });
  }

  private clearMessages(loadMatchId: number): void {
    delete this.actionErrors[loadMatchId];
    delete this.actionSuccess[loadMatchId];
  }

  private extract(response: any): LoadMatch[] {
    if (!response) return [];
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.dataList)) return response.dataList;
    if (Array.isArray(response)) return response;
    return [];
  }
}
