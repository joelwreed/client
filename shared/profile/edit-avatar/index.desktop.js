// @flow
import * as React from 'react'
import fs from 'fs'
import {clamp} from 'lodash-es'
import {
  Box,
  Button,
  ButtonBar,
  Icon,
  MaybePopup,
  Text,
  WaitingButton,
  iconCastPlatformStyles,
} from '../../common-adapters'
import {EDIT_AVATAR_ZINDEX} from '../../constants/profile'
import {
  collapseStyles,
  glamorous,
  globalColors,
  globalMargins,
  globalStyles,
  styleSheetCreate,
} from '../../styles'
import type {Props} from '.'

type State = {
  dragStartX: number,
  dragStartY: number,
  dragStopX: number,
  dragStopY: number,
  dragging: boolean,
  dropping: boolean,
  hasPreview: boolean,
  imageSource: string,
  offsetLeft: number,
  offsetTop: number,
  originalImageHeight: number,
  originalImageWidth: number,
  scale: number,
  scaledImageHeight: number,
  scaledImageWidth: number,
  submitting: boolean,
}

const AVATAR_CONTAINER_SIZE = 175
const AVATAR_BORDER_SIZE = 5
const AVATAR_SIZE = AVATAR_CONTAINER_SIZE - AVATAR_BORDER_SIZE * 2
const SCALE_OFFSET = 5

class EditAvatar extends React.Component<Props, State> {
  _file: ?HTMLInputElement
  _image: ?HTMLImageElement

  constructor(props: Props) {
    super(props)
    this.state = {
      dragStartX: 0,
      dragStartY: 0,
      dragStopX: 0,
      dragStopY: 0,
      dragging: false,
      dropping: false,
      hasPreview: false,
      imageSource: '',
      offsetLeft: 0,
      offsetTop: 0,
      originalImageHeight: 0,
      originalImageWidth: 0,
      scale: SCALE_OFFSET,
      scaledImageHeight: 1,
      scaledImageWidth: 1,
      submitting: false,
    }
  }

  _imageSetRef = (ref: ?HTMLImageElement) => {
    this._image = ref
  }

  _filePickerFiles = () => (this._file && this._file.files) || []

  _filePickerOpen = () => {
    this._file && this._file.click()
  }

  _filePickerSetRef = (r: ?HTMLInputElement) => {
    this._file = r
  }

  _filePickerSetValue = (value: string) => {
    if (this._file) this._file.value = value
  }

  _pickFile = () => {
    const fileList = this._filePickerFiles()
    const paths = fileList.length
      ? Array.prototype.map
          .call(fileList, (f: File) => {
            // We rely on path being here, even though it's
            // not part of the File spec.
            // $ForceType
            const path: string = f.path
            return path
          })
          .filter(Boolean)
      : []
    if (paths) {
      this._paintImage(paths.pop())
    }
    this._filePickerSetValue('')
  }

  _onDragLeave = () => {
    this.setState({dropping: false})
  }

  _onDrop = (e: SyntheticDragEvent<any>) => {
    this.setState({dropping: false})
    if (!this._validDrag(e)) {
      return
    }
    const fileList = e.dataTransfer.files
    const paths = fileList.length ? Array.prototype.map.call(fileList, f => f.path) : []
    if (paths.length) {
      // TODO: Show an error when there's more than one path.
      for (let path of paths) {
        // Check if any file is a directory and bail out if not
        try {
          // We do this synchronously
          // in testing, this is instantaneous
          // even when dragging many files
          const stat = fs.lstatSync(path)
          if (stat.isDirectory()) {
            // TODO: Show a red error banner on failure: https://zpl.io/2jlkMLm
            return
          }
        } catch (e) {
          // TODO: Show a red error banner on failure: https://zpl.io/2jlkMLm
        }
      }
      this._paintImage(paths.pop())
    }
  }

  _validDrag = (e: SyntheticDragEvent<any>) => {
    return Array.prototype.map.call(e.dataTransfer.types, t => t).includes('Files')
  }

  _onDragOver = (e: SyntheticDragEvent<any>) => {
    this.setState({dropping: true})
    if (this._validDrag(e)) {
      e.dataTransfer.dropEffect = 'copy'
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
  }

  _paintImage = (path: string) => {
    this.setState({imageSource: path})
  }

  _onImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    let height = e.currentTarget.naturalHeight
    let width = e.currentTarget.naturalWidth
    let scale = SCALE_OFFSET

    if (height < AVATAR_SIZE) {
      height = AVATAR_SIZE
      scale = e.currentTarget.naturalHeight / AVATAR_SIZE + SCALE_OFFSET
      width = AVATAR_SIZE * e.currentTarget.naturalWidth / e.currentTarget.naturalHeight
    }

    if (width < AVATAR_SIZE) {
      height = AVATAR_SIZE * e.currentTarget.naturalHeight / e.currentTarget.naturalWidth
      scale = e.currentTarget.naturalWidth / AVATAR_SIZE + SCALE_OFFSET
      width = AVATAR_SIZE
    }

    this.setState({
      hasPreview: true,
      offsetLeft: Math.round(width / -2 + AVATAR_SIZE / 2),
      offsetTop: Math.round(height / -2 + AVATAR_SIZE / 2),
      originalImageHeight: e.currentTarget.naturalHeight,
      originalImageWidth: e.currentTarget.naturalWidth,
      scale,
      scaledImageHeight: height,
      scaledImageWidth: width,
    })
  }

  _onRangeChange = (e: SyntheticInputEvent<any>) => {
    const scale = e.currentTarget.value
    const scaledImageHeight = Math.round(this.state.originalImageHeight * (scale / SCALE_OFFSET))
    const scaledImageWidth = Math.round(this.state.originalImageWidth * (scale / SCALE_OFFSET))

    if (scaledImageHeight < AVATAR_SIZE || scaledImageWidth < AVATAR_SIZE) return

    const offsetLeft =
      this._image && this._image.style.left ? parseInt(this._image.style.left, 10) : this.state.dragStopX
    const offsetTop =
      this._image && this._image.style.top ? parseInt(this._image.style.top, 10) : this.state.dragStopY
    const offsetLeftLimit = AVATAR_SIZE - scaledImageWidth
    const offsetTopLimit = AVATAR_SIZE - scaledImageHeight

    this.setState({
      offsetLeft: clamp(offsetLeft, offsetLeftLimit, 0),
      offsetTop: clamp(offsetTop, offsetTopLimit, 0),
      scale,
      scaledImageHeight,
      scaledImageWidth,
    })
  }

  _onMouseDown = (e: SyntheticMouseEvent<any>) => {
    this.setState({
      dragStartX: e.pageX,
      dragStartY: e.pageY,
      dragStopX:
        this._image && this._image.style.left ? parseInt(this._image.style.left, 10) : this.state.dragStopX,
      dragStopY:
        this._image && this._image.style.top ? parseInt(this._image.style.top, 10) : this.state.dragStopY,
      dragging: true,
      offsetLeft: this._image ? this._image.offsetLeft : this.state.offsetLeft,
      offsetTop: this._image ? this._image.offsetTop : this.state.offsetTop,
    })
  }

  _onMouseUp = () => {
    this.setState({
      dragStopX:
        this._image && this._image.style.left ? parseInt(this._image.style.left, 10) : this.state.dragStopX,
      dragStopY:
        this._image && this._image.style.top ? parseInt(this._image.style.top, 10) : this.state.dragStopY,
      dragging: false,
      offsetLeft: this._image ? this._image.offsetLeft : this.state.offsetLeft,
      offsetTop: this._image ? this._image.offsetTop : this.state.offsetTop,
    })
  }

  _onMouseMove = (e: SyntheticMouseEvent<any>) => {
    if (!this.state.dragging || this.state.submitting) return

    const dragLeft = this.state.dragStopX + e.pageX - this.state.dragStartX
    const dragTop = this.state.dragStopY + e.pageY - this.state.dragStartY
    const dragLeftLimit = AVATAR_SIZE - this.state.scaledImageWidth
    const dragTopLimit = AVATAR_SIZE - this.state.scaledImageHeight

    this.setState({
      offsetLeft: clamp(dragLeft, dragLeftLimit, 0),
      offsetTop: clamp(dragTop, dragTopLimit, 0),
    })
  }

  _onSave = () => {
    this.setState({submitting: true})

    const x = this.state.offsetLeft * -1
    const y = this.state.offsetTop * -1
    const rH =
      this.state.scaledImageHeight !== 0 ? this.state.originalImageHeight / this.state.scaledImageHeight : 1
    const rW =
      this.state.scaledImageWidth !== 0 ? this.state.originalImageWidth / this.state.scaledImageWidth : 1
    const crop = {
      x0: Math.round(x * rW),
      x1: Math.round((x + AVATAR_SIZE) * rW),
      y0: Math.round(y * rH),
      y1: Math.round((y + AVATAR_SIZE) * rH),
    }
    this.props.onSave(this.state.imageSource, crop)
  }

  render() {
    return (
      <MaybePopup
        onClose={this.props.onClose}
        styleCover={collapseStyles([
          styles.cover,
          {
            cursor: this.state.dragging ? '-webkit-grabbing' : 'default',
          },
        ])}
        onMouseUp={this._onMouseUp}
        onMouseDown={this._onMouseDown}
        onMouseMove={this._onMouseMove}
      >
        <Box
          className={this.state.dropping ? 'dropping' : ''}
          onDragLeave={this._onDragLeave}
          onDragOver={this._onDragOver}
          onDrop={this._onDrop}
          style={styles.container}
        >
          <Text type="BodyBig">Drag and drop a new profile image</Text>
          <Text type="BodyPrimaryLink" className="hover-underline" onClick={this._filePickerOpen}>
            or browse your computer for one
          </Text>
          <HoverBox
            className={this.state.hasPreview ? 'filled' : ''}
            onClick={this.state.hasPreview ? null : this._filePickerOpen}
            style={styles.imageContainer}
          >
            <input
              accept="image/*"
              multiple={false}
              onChange={this._pickFile}
              ref={this._filePickerSetRef}
              style={styles.hidden}
              type="file"
            />
            <img
              ref={this._imageSetRef}
              src={this.state.imageSource}
              style={{
                height: this.state.scaledImageHeight,
                left: `${this.state.offsetLeft}px`,
                position: 'absolute',
                top: `${this.state.offsetTop}px`,
                width: this.state.scaledImageWidth,
              }}
              onDragStart={e => e.preventDefault()}
              onLoad={this._onImageLoad}
            />
            {!this.state.hasPreview && (
              <Icon
                className="icon"
                color={globalColors.grey}
                fontSize={48}
                style={iconCastPlatformStyles(styles.icon)}
                type="iconfont-camera"
              />
            )}
          </HoverBox>
          <input
            disabled={!this.state.hasPreview || this.state.submitting}
            min={1}
            max={10}
            onChange={this._onRangeChange}
            onMouseMove={e => e.stopPropagation()}
            step="any"
            style={styles.slider}
            type="range"
            value={this.state.scale}
          />
          <ButtonBar>
            <Button
              disabled={this.state.submitting}
              label="Cancel"
              onClick={this.props.onClose}
              type="Secondary"
            />
            <WaitingButton
              disabled={!this.state.hasPreview}
              label="Save"
              onClick={this._onSave}
              type="Primary"
              waitingKey={null}
            />
          </ButtonBar>
        </Box>
      </MaybePopup>
    )
  }
}

const HoverBox = glamorous(Box)({
  '&.filled': {
    backgroundColor: globalColors.white,
    borderColor: globalColors.lightGrey2,
    borderStyle: 'solid',
    cursor: '-webkit-grab',
  },
  '&.filled:active': {
    cursor: '-webkit-grabbing',
  },
  '&.filled:hover': {
    backgroundColor: globalColors.white,
    borderColor: globalColors.lightGrey2,
  },
  '&:hover .icon, .dropping & .icon': {
    color: globalColors.black_40,
  },
  '&:hover, .dropping &': {
    borderColor: globalColors.black_40,
  },
  backgroundColor: globalColors.lightGrey2,
  borderColor: globalColors.grey,
  borderRadius: AVATAR_CONTAINER_SIZE,
  borderStyle: 'dashed',
  borderWidth: AVATAR_BORDER_SIZE,
  cursor: 'pointer',
  flex: 0,
  height: AVATAR_CONTAINER_SIZE,
  marginBottom: globalMargins.small,
  marginTop: globalMargins.medium,
  overflow: 'hidden',
  position: 'relative',
  width: AVATAR_CONTAINER_SIZE,
})

const styles = styleSheetCreate({
  container: {
    ...globalStyles.flexBoxColumn,
    alignItems: 'center',
    minWidth: 460,
    paddingBottom: globalMargins.xlarge,
    paddingTop: globalMargins.xlarge,
  },
  cover: {
    zIndex: EDIT_AVATAR_ZINDEX,
  },
  hidden: {
    display: 'none',
  },
  icon: {
    left: '50%',
    marginLeft: -24,
    marginTop: -21,
    position: 'absolute',
    top: '50%',
  },
})

export default EditAvatar
