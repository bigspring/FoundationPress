// gForms validation
(function($) {
	if ($('.gform_wrapper').length) {
		var $body = $('body');
		
		$body.on('click', 'input,textarea', function() {
			hideErrors($(this));
		});
		
		$body.on('click', '.validation_message', function() {
			$(this).hide();
			hideErrors($(this));
		});
	}
	
	function hideErrors($el) {
		$el.closest('li.gfield_error').removeClass('gfield_error');
		$el.closest('div.ginput_container').next('div.validation_message').hide();
	}
})(jQuery);
