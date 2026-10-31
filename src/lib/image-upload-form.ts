import { Platform } from 'react-native';

export type LocalImageFile = { uri: string; name: string; type: string };

/** Build multipart data in the shape expected by browser and React Native fetch. */
export async function imageUploadForm(file: LocalImageFile): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const response = await fetch(file.uri);
    if (!response.ok) throw new Error('Không đọc được ảnh đã chọn. Hãy chọn lại ảnh rồi thử lại.');
    form.append('file', await response.blob(), file.name);
  } else {
    form.append('file', file as unknown as Blob);
  }
  return form;
}
