import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../authentication.service';
import {CameraService} from '../camera.service';
import { ShareService } from '../share.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

	imagePath = '/assets/cactus.png'
	shareForm: FormGroup;
	disableShare: Boolean = true;

	constructor(private cameraSvc: CameraService, private fb: FormBuilder,
		private authenticationSvc: AuthenticationService, private shareSvc: ShareService,
		private router: Router) { }

	ngOnInit(): void {
		if (this.cameraSvc.hasImage()) {
			const img = this.cameraSvc.getImage()
			this.imagePath = img.imageAsDataUrl
			this.disableShare = false;
		}
		this.shareForm = this.fb.group({
			title: this.fb.control('', [Validators.required]),
			comments: this.fb.control('', [Validators.required])
		})
		console.log('disableshare', this.disableShare)
	}

	clear() {
		this.imagePath = '/assets/cactus.png'
		this.disableShare = true;
	}

	share(){
		console.log('data', this.shareForm, 'image', this.imagePath)
		console.log('credentials', this.authenticationSvc.credentials.user_id)
		const shareData = new FormData();
		shareData.set('title', this.shareForm.get('title').value);
		shareData.set('comments', this.shareForm.get('comments').value);
		shareData.set('user_id', this.authenticationSvc.credentials.user_id)
		shareData.set('password', this.authenticationSvc.credentials.password)
		shareData.set('upload', this.cameraSvc.getImage().imageData)

		this.shareSvc.shareInformation(shareData)
			.then(results => {
				console.log('id after share', results)
				this.clear();
				this.shareForm.reset();
			})
			.catch(e => {
				console.log('error', e.status)
				if(e.status == '401')
				{
					this.router.navigate(['/'])
				}
			});
	}
}
