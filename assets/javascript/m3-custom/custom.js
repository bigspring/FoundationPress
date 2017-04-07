//Fix flyout menu parent submenu link unclickable issue
jQuery('.menu-item-has-children > a').click(function(){
	jQuery(this).unbind('click');
});