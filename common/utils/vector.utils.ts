import { Injectable } from '@nestjs/common';

@Injectable()
export class VectorUtils {
  cosineSimilarityVector(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }

    const magnitudeA = Math.hypot(...vecA);
    const magnitudeB = Math.hypot(...vecB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }
  createVector(genres: string[], allPossibleGenres: string[]): number[] {
    const vector = new Array(allPossibleGenres.length).fill(0);
    for (const genre of genres) {
      const index = allPossibleGenres.indexOf(genre);
      if (index !== -1) {
        vector[index] = 1;
      } else {
        console.debug(`Genre "${genre}" not found in ALL_POSSIBLE_GENRES.`);
      }
    }
    return vector;
  }
}
