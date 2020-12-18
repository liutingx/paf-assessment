export interface CameraImage {
	imageAsDataUrl: string
	imageData: Blob
}

export interface Login {
	user_id: string,
	password: string
}

export interface ShareData {
	title: string,
	comments: string,
	img_data: string
}