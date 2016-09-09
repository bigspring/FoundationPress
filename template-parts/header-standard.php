<?php
/**
 * Template part for page header, used as a banner header on most templates
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

?>

<header class="page-header" role="banner">
	<div class="caption">
		<h1><?php the_title(); ?></h1>
		<p class="lead"><?= get_the_excerpt(); ?></p>
	</div>
</header>
