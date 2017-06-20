jQuery(document).ready(function ($) {
	
	var mediaUploader;
	
	$('.media-uploader').click(function (e) {
		
		var $this = $(this);
		
		e.preventDefault();
		// If the uploader object has already been created, reopen the dialog
		if (mediaUploader) {
			mediaUploader.open();
			return;
		}
		// Extend the wp.media object
		mediaUploader = wp.media.frames.file_frame = wp.media({
			title: 'Choose Image',
			button: {
				text: 'Choose Image'
			}, multiple: false
		});
		
		// When a file is selected, grab the URL and set it as the text field's value
		mediaUploader.on('select', function () {
			var attachment = mediaUploader.state().get('selection').first().toJSON();
			$('.m3-media-upload', $this.closest('td')).val(attachment.id);
			
			console.log(attachment);
			
			var $imagePreview = $('.image-preview', $this.closest('td'));
			$imagePreview.empty();
			
			var imageUrl = attachment.sizes["thumbnail"].url;
			if (attachment.sizes.hasOwnProperty('fp-tiny')) {
				imageUrl = attachment.sizes["fp-small"].url
			}
			
			var $img = $('<img>', {src: imageUrl});
			$imagePreview.append($img);
		});
		
		// Open the uploader dialog
		mediaUploader.open();
	});
	
});