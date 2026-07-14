import { v2 as cloudinary } from 'cloudinary';

// 1. Configure Cloudinary (Using the credentials you provided)
cloudinary.config({
  cloud_name: 't6l3szmz',
  api_key: '188138577389244',
  api_secret: 'GZF9BBKAzlzDprm3xbr9L2WtNGE',
});

async function run() {
  try {
    console.log('Uploading image...');
    
    // 2. Upload an image (using a sample image from Cloudinary's demo domain)
    const uploadResult = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      { public_id: 'sample_onboarding_image' }
    );
    
    console.log('\n--- Upload Success ---');
    console.log(`Public ID: ${uploadResult.public_id}`);
    console.log(`Secure URL: ${uploadResult.secure_url}`);

    // 3. Get image details
    // The upload result already contains metadata, so we can print it directly
    console.log('\n--- Image Metadata ---');
    console.log(`Width: ${uploadResult.width}px`);
    console.log(`Height: ${uploadResult.height}px`);
    console.log(`Format: ${uploadResult.format}`);
    console.log(`File Size: ${uploadResult.bytes} bytes`);

    // 4. Transform the image
    // f_auto: Automatically selects the most efficient image format based on the requesting browser (e.g., WebP/AVIF for Chrome).
    // q_auto: Automatically adjusts the compression level to minimize file size without visible degradation.
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto',
      quality: 'auto'
    });

    console.log('\n--- Transformation Success ---');
    console.log('Done! Click the link below to see the optimized version of the image. Check the size and the format.');
    console.log(`Transformed URL: ${transformedUrl}`);

  } catch (error) {
    console.error('Error during Cloudinary operations:', error);
  }
}

run();
