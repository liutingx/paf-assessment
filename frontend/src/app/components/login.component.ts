import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../authentication.service';
import { Login } from '../models';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

	errorMessage = ''
  loginform: FormGroup;

  constructor(private fb: FormBuilder, private authenticationSvc: AuthenticationService,
    private router: Router) { }

	ngOnInit(): void {
    this.loginform = this.fb.group({
      user_id: this.fb.control('', [Validators.required]),
      password: this.fb.control('', [Validators.required])
    })
   }

   login(){
     console.log('formdata', this.loginform)
     this.authenticationSvc.loginAuthenticate(this.loginform.value as Login)
      .then(results => {
        this.authenticationSvc.credentials = this.loginform.value;
        console.log('login', results)
        this.router.navigate(['main'])
      })
      .catch(e => {
        console.log('error', e.error.log)
        this.errorMessage=e.error.log
      })
   }

}
