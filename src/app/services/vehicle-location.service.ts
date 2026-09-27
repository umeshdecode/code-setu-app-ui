import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { ENV } from 'src/assets/env';

@Injectable({
  providedIn: 'root'
})
export class VehicleLocationService {

  private BASE_URL = ENV.CARGO_SETU + "/api/v2/cargosetu";

  private stompClient!: Client;
  private subscription!: StompSubscription;

  private currentVehicleId!: number;

  private locationSubject = new BehaviorSubject<any>(null);
  location$ = this.locationSubject.asObservable();

  constructor(private http: HttpClient) { }

  // 🔥 REST API - backend: GET /api/v2/cargosetu/vehicle/location/{vehicleId}/location
  getLiveLocation(vehicleId: number) {
    return this.http.get<any>(
      `${this.BASE_URL}/vehicle/location/${vehicleId}/location`
    );
  }

  loadInitialLocation(vehicleId: any): Observable<any> {
    return this.getLiveLocation(vehicleId);
  }

  connect(vehicleId: number) {
    this.currentVehicleId = vehicleId;

    if (this.stompClient && this.stompClient.active) {
      this.subscribeToVehicle();
      return;
    }
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${ENV.CARGO_SETU}/ws`),
      reconnectDelay: 5000,

      onConnect: () => {
        console.log('WebSocket Connected');
        this.subscribeToVehicle();
      },

      onStompError: (frame) => {
        console.error('Broker error:', frame);
      }
    });

    this.stompClient.activate();
  }

  private subscribeToVehicle() {
    if (this.subscription) {
      this.subscription.unsubscribe(); // 🔥 important
    }

    this.subscription = this.stompClient.subscribe(
      `/topic/vehicle/${this.currentVehicleId}`,
      (message: IMessage) => {
        const data = JSON.parse(message.body);
        this.locationSubject.next(data);
      }
    );
  }

  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    if (this.stompClient) {
      this.stompClient.deactivate();
    }

    // Don't replay the previous vehicle's last position to the next subscriber.
    this.locationSubject.next(null);
  }
}
