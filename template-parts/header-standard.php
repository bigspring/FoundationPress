<?php
/**
 * Template part for page header
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

?>

<header class="header-standard" role="banner">
	<div class="caption">
		<?php get_template_part('/template-parts/page-header-title'); ?>
		<?php if(!is_home()) : ?>
		<?php get_template_part('/template-parts/page-header-excerpt'); ?>
		<?php endif; ?>
	</div>
</header>
