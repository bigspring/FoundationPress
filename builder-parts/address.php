<ul class="address-list menu <?php echo $type; ?>">
	<?php if(get_option('monolith_address_1')) : ?>
		<li><?php echo get_option('monolith_address_1'); ?></li>
	<?php endif; ?>
	<?php if(get_option('monolith_address_2')) : ?>
		<li><?php echo get_option('monolith_address_2'); ?></li>
	<?php endif; ?>
	<?php if(get_option('monolith_address_3')) : ?>
		<li><?php echo get_option('monolith_address_3'); ?></li>
	<?php endif; ?>
	<?php if(get_option('monolith_city')) : ?>
		<li><?php echo get_option('monolith_city'); ?></li>
	<?php endif; ?>
	<?php if(get_option('monolith_county')) : ?>
		<li><?php echo get_option('monolith_county'); ?></li>
	<?php endif; ?>
	<?php if(get_option('monolith_postcode')) : ?>
		<li><?php echo get_option('monolith_postcode'); ?></li>
	<?php endif; ?>
	<?php if(get_option('monolith_country')) : ?>
		<li><?php echo get_option('monolith_country'); ?></li>
	<?php endif; ?>
</ul>