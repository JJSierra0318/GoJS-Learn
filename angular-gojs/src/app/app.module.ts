import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { GojsAngularModule } from 'gojs-angular';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { InspectorComponent } from './inspector/inspector.component';

@NgModule({
  declarations: [
    AppComponent,
    InspectorComponent
  ],
  imports: [
    BrowserModule,
    GojsAngularModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
