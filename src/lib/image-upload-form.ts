import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { File as ExpoFile } from 'expo-file-system';

export type LocalImageFile = { uri: string; name: string; type: string };

/** Build multipart data in the shape expected by browser and React Native fetch. */
export async function imageUploadForm(file: LocalImageFile): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const response = await fetch(file.uri);
    if (!response.ok) throw new Error('Không đọc được ảnh đã chọn. Hãy chọn lại ảnh rồi thử lại.');
    form.append('file', await response.blob(), file.name);
  } else {
    const normalized = await ImageManipulator.manipulateAsync(
      file.uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.76, format: ImageManipulator.SaveFormat.JPEG },
    );
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    const imageFile = new ExpoFile(normalized.uri);
    // Expo SDK 58's Winter fetch reads parts with bytes(); RN's { uri } part is unsupported here.
    form.append('file', {
      name: `${baseName}.jpg`,
      type: 'image/jpeg',
      bytes: () => imageFile.bytes(),
    } as unknown as Blob);
  }
  return form;
}
