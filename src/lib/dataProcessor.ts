export interface ImageData {
  image_id: string;
  original_semantic_contacts: string[];
  llama4_scout_inference_contacts: string[] | null;
  llama4_scout_inference_raw: string;
  gemini_inference_contacts: string[] | null;
  gemini_inference_raw: string;
}

export interface EvaluationPair {
  imageId: string;
  modelName: string;
  imageUrl: string;
  originalContacts: string[];
  modelContacts: string[];
  modelRawResponse: string;
}

export function processVisionResults(resultsData: Record<string, ImageData>): EvaluationPair[] {
  const pairs: EvaluationPair[] = [];
  const baseImageUrl = 'https://ml-datasets-maikyon.s3.us-west-2.amazonaws.com/cropped_images_2_total_people';
  
  Object.entries(resultsData).forEach(([imageId, data]) => {
    // Add original semantic contacts as a reference pair
    pairs.push({
      imageId,
      modelName: 'original',
      imageUrl: `${baseImageUrl}/${imageId}.png`,
      originalContacts: data.original_semantic_contacts,
      modelContacts: data.original_semantic_contacts,
      modelRawResponse: 'Ground truth semantic contacts'
    });
    
    // Add Llama4 Scout pairs
    if (data.llama4_scout_inference_contacts) {
      pairs.push({
        imageId,
        modelName: 'llama4_scout',
        imageUrl: `${baseImageUrl}/${imageId}.png`,
        originalContacts: data.original_semantic_contacts,
        modelContacts: data.llama4_scout_inference_contacts,
        modelRawResponse: data.llama4_scout_inference_raw
      });
    }
    
    // Add Gemini pairs
    if (data.gemini_inference_contacts) {
      pairs.push({
        imageId,
        modelName: 'gemini',
        imageUrl: `${baseImageUrl}/${imageId}.png`,
        originalContacts: data.original_semantic_contacts,
        modelContacts: data.gemini_inference_contacts,
        modelRawResponse: data.gemini_inference_raw
      });
    }
  });
  
  return pairs;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}