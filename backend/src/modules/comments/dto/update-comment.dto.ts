import { IsNotEmpty, IsString } from 'class-validator';
import { IsNotWhitespace } from './create-comment.dto';

export class UpdateCommentDto {
  @IsString({ message: 'content must be a string' })
  @IsNotEmpty({ message: 'content should not be empty' })
  @IsNotWhitespace({ message: 'content must not be empty or contain only whitespace' })
  content!: string;
}
