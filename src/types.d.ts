export type ExecResult = {
  succesful: boolean
  code: number
  output: string
}

export type ContainerImage = {
  name: string
  tag: string
  indexDigest: string
  os: string
  arch: string
  variant: string
  size: string
  created: string
  manifestDigest: string
}

export type Container = {
  id: string
  image: string
  os: string
  arch: string
  state: string
  addr: string
}